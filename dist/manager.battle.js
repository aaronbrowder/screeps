"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const rooms = require("./rooms");
const queue = require("./spawn.queue");
/* IDEAS
 *
 * We should spawn waves for defense rather than just marching in one at a time.
 * If ravager is in a room controlled by me, it should hide in ramparts if possible.
 *
 * Each creep calculates a "boldness" factor for itself that represents its melee strength compared with its ranged strength.
 * Creeps with higher boldness want to be on the front line to melee attack the target structure.
 * If a creep with high boldness is behind a creep with a lower boldness, the two creeps will negotiate with each
 * other and then switch places.
*/
function run() {
    cleanUpOldWaves();
    for (let i = 0; i < Memory.raidWaves.length; i++) {
        const wave = Memory.raidWaves[i];
        if (!wave.creeps) {
            assignCreepsToWaves();
        }
        if (!wave.ready) {
            wave.ready = getIsWaveReady(wave);
        }
        if (wave.ready) {
            const creeps = wave.creeps.map(o => Game.getObjectById(o));
            const leader = util.firstOrDefault(creeps, o => o && o.room.name === wave.targetRoomName);
            if (leader && !wave.targetStructureId) {
                const targetStructure = determineTarget(wave, leader);
                if (targetStructure) {
                    wave.targetStructureId = targetStructure.id;
                }
            }
        }
    }
}
exports.run = run;
function declareVictory(wave) {
    console.log('VICTORY!!!');
    util.modifyRoomMemory(wave.targetRoomName, o => o.isConquered = true);
    // All creeps spawned to fight in this room will wait around until they die.
    // We don't want to recycle them, in case enemy reinforcements arrive.
    // We do however want to cancel all ravagers in spawn queues.
    queue.removeItemsFromAllQueues(o => o.assignedRoomName === wave.targetRoomName);
}
exports.declareVictory = declareVictory;
function assignCreepsToWaves() {
    const waves = Memory.raidWaves;
    if (!waves || !waves.length) {
        return;
    }
    for (let i = 0; i < waves.length; i++) {
        waves[i].creeps = [];
    }
    for (let name in Game.creeps) {
        const creep = Game.creeps[name];
        if (!creep.memory.raidWaveId)
            continue;
        const wave = util.firstOrDefault(Memory.raidWaves, o => o.id === creep.memory.raidWaveId);
        if (wave) {
            wave.creeps.push(creep.id);
        }
    }
}
exports.assignCreepsToWaves = assignCreepsToWaves;
function cleanUpOldWaves() {
    if (Game.time % 237 === 0) {
        Memory.raidWaves = util.filter(Memory.raidWaves, w => util.any(w.creeps, c => !!c));
    }
}
function getIsWaveReady(wave) {
    if (Memory.rooms[wave.targetRoomName].isConquered) {
        return false;
    }
    if (Game.time >= wave.deadline) {
        // time's up. no point in spawning any more creeps in this wave.
        queue.removeItemsFromAllQueues(o => o.raidWaveId === wave.id);
        return true;
    }
    const meetupFlag = Game.flags[rooms.getRaidWaveMeetupFlagName(wave.targetRoomName)];
    if (!meetupFlag)
        return false;
    // if there are still creeps in spawn queues, the wave is not ready
    if (queue.countItemsInAllQueues(o => o.raidWaveId === wave.id) > 0) {
        return false;
    }
    // if any creep in the wave is not ready, the wave is not ready
    for (let i = 0; i < wave.creeps.length; i++) {
        const creep = Game.getObjectById(wave.creeps[i]);
        if (!creep)
            continue;
        if (creep.spawning)
            return false;
        if (creep.room.name !== meetupFlag.room.name)
            return false;
        if (meetupFlag.pos.getRangeTo(creep) > 3)
            return false;
    }
    return true;
}
function determineTarget(wave, leader) {
    const raidDirective = rooms.getRaidDirective(wave.targetRoomName);
    if (!raidDirective || !raidDirective.targetStructureIds.length) {
        return null;
    }
    const targets = raidDirective.targetStructureIds.map(o => Game.getObjectById(o));
    const firstTarget = util.firstOrDefault(targets, o => !!o);
    if (!firstTarget)
        return null;
    return determineIntermediateTarget(wave, firstTarget);
}
function determineIntermediateTarget(wave, target) {
    // TODO implement
    return target;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
// LEGACY //////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
function pursueTarget(leader) {
    // TODO make sure the leader is not leaving its followers behind
    // TODO if we are losing the battle, the leader should retreat and others should follow
    // TODO we should be careful when passing through a narrow bottleneck. enemy could pick us off one by one.
    // We don't need to calculate this path very often because hostile structures are not going to move.
    // If the target structure is destroyed, we will return false and calculate a new path.
    if (leader.memory.leaderTargetId && Game.time - leader.memory.leaderTargetTime < 50) {
        var target = Game.getObjectById(leader.memory.leaderTargetId);
        if (target) {
            var opts = {
                ignoreCreeps: true,
                ignoreDestructibleStructures: true,
                visualizePathStyle: { stroke: '#fff' },
                maxRooms: 1,
                costCallback: getCostMatrix,
                plainCost: 0,
                swampCost: 0,
                ignoreRoads: true,
                range: 1,
                reusePath: 50
            };
            var result = leader.moveTo(target, opts);
            return result !== ERR_NO_PATH;
        }
    }
    return false;
}
function findTarget(leader, myCreeps) {
    // Our army wants to destroy towers and spawns. It will do whatever it can to reach a tower or
    // spawn as quickly as possible. This may involve using an existing path or it may involve
    // making a path by destroying obstacles, whichever is estimated to be faster. We need to choose
    // a target based on how threatening that target is and how long it will take to get there.
    // We will choose a path using a custom cost matrix which treats hostile structures as walkable
    // spaces with cost equal to the estimated time to break that structure.
    // TODO treat ramparts as harder to traverse than walls
    var costMatrix = getCostMatrix(leader.room.name);
    var myDamageOutput = _.sum(myCreeps, getDamageOutput);
    var targets = leader.room.find(FIND_HOSTILE_STRUCTURES, {
        filter: o => o.structureType === STRUCTURE_TOWER
            || o.structureType === STRUCTURE_STORAGE
            || o.structureType === STRUCTURE_SPAWN
    });
    var valueData = targets.map(o => getTargetValue(o, costMatrix));
    return util.getBestValue(valueData);
    function getTargetValue(target, costMatrix) {
        var path = findWalkablePath(leader.pos, target);
        if (!path || !path.length) {
            path = findBreakablePath(leader.pos, target, costMatrix);
        }
        var time = estimateTimeToTraversePath(path);
        return {
            target: target,
            value: getPriorityOfTarget(target, time)
        };
    }
    function findWalkablePath(start, target) {
        return start.findPathTo(target, {
            ignoreCreeps: true,
            maxRooms: 1,
            range: 1
        });
    }
    function findBreakablePath(start, target, costMatrix) {
        const opts = {
            ignoreCreeps: true,
            ignoreDestructibleStructures: true,
            maxRooms: 1,
            costCallback: r => costMatrix,
            plainCost: 0,
            swampCost: 0,
            ignoreRoads: true,
            range: 1
        };
        return start.findPathTo(target, opts);
    }
    function estimateTimeToTraversePath(path) {
        if (!path || !path.length)
            return -1;
        var walkTime = path.length * 3;
        var obstacles = getObstaclesInPath(path);
        var breakTime = _.sum(obstacles, o => o.hits) / myDamageOutput;
        return walkTime + breakTime;
    }
    function getObstaclesInPath(path) {
        var room = leader.room;
        var obstacles = [];
        for (let i in path) {
            var step = path[i];
            obstacles = obstacles.concat(room.lookForAt(LOOK_STRUCTURES, step.x, step.y));
        }
        return obstacles;
    }
    function getPriorityOfTarget(target, estimatedTimeToReach) {
        if (estimatedTimeToReach === -1)
            return 0;
        const timeToKill = target.hits / myDamageOutput;
        var typePriority = 1;
        if (target.structureType === STRUCTURE_TOWER) {
            // towers are far more dangerous than spawns
            typePriority = 10;
        }
        if (util.isStorage(target)) {
            // priority of storage is based on how much energy is in there
            typePriority = _.sum(target.store) / 5000;
        }
        return typePriority / (timeToKill * estimatedTimeToReach);
    }
}
function getCostMatrix(roomName) {
    var room = Game.rooms[roomName];
    var costMatrix = new PathFinder.CostMatrix;
    var walls = room.find(FIND_STRUCTURES, {
        filter: (o) => o.structureType === STRUCTURE_WALL || o.structureType === STRUCTURE_RAMPART
    });
    if (walls.length) {
        var maxHits = _.sortBy(walls.map(o => o.hits), o => -o)[0];
        var multiplier = 254 / maxHits;
        for (let i in walls) {
            var wall = walls[i];
            costMatrix.set(wall.pos.x, wall.pos.y, Math.floor(wall.hits * multiplier));
        }
    }
    return costMatrix;
}
function getDamageOutput(creep) {
    return (creep.getActiveBodyparts(ATTACK) * 30) + (creep.getActiveBodyparts(RANGED_ATTACK) * 10);
}
//# sourceMappingURL=manager.battle.js.map