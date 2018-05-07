import * as util from './util';

export function run() {

    if (!Memory.siegeMode) return;

    var battleRoomNames = getBattleRoomNames();
    var battleRooms = battleRoomNames.map(o => Game.rooms[o]);

    for (let i in battleRooms) {
        manageBattleInRoom(battleRooms[i]);
    }

    function getBattleRoomNames(): string[] {
        var battleRoomNames: string[] = [];
        for (var name in Game.creeps) {
            var creep = Game.creeps[name];
            var battleRoomName: string = creep.memory.assignedRoomName;
            var role: string = creep.memory.role;
            if (creep.room.name === battleRoomName &&
                battleRoomNames.indexOf(battleRoomName) === -1 &&
                role === 'crusher' || role === 'hunter' || role === 'medic') {
                battleRoomNames.push(battleRoomName);
            }
        }
        return battleRoomNames;
    }

    function manageBattleInRoom(room: Room) {
        // Treat all my creeps as a unit. They all want to go to the same place.
        // Maybe they are not all in the same place, but we can assume that if there is a solid
        // wall, all my creeps are on the same side of it.
        // We should designate one living creep as the leader. The leader will calculate a path
        // to the target area and move to it. The other creeps will try not to be too far away from
        // the leader, while still doing independent things such as attacking nearby targets.
        if (!room) return;
        var myCreeps: Creep[] = room.find(FIND_MY_CREEPS);
        var crushers: Creep[] = _.filter(myCreeps, o => o.role === 'crusher');
        if (!crushers.length) return;
        var leader = assignLeader(crushers);
        if (pursueTarget(leader)) return;
        var target = findTarget(leader, myCreeps);
        if (!target) return;
        leader.memory.leaderTargetId = target.id;
        leader.memory.leaderTargetTime = Game.time;
        pursueTarget(leader);
    }

    function assignLeader(creeps: Creep[]) {
        var leader = util.filter(creeps, o => o.memory.isLeader === true)[0];
        if (!leader) {
            // TODO use more sophisticated leader selection
            leader = creeps[0];
            leader.memory.isLeader = true;
        }
        return leader;
    }

    function pursueTarget(leader: Creep) {
        // TODO make sure the leader is not leaving its followers behind
        // TODO if we are losing the battle, the leader should retreat and others should follow
        // TODO we should be careful when passing through a narrow bottleneck. enemy could pick us off one by one.
        // We don't need to calculate this path very often because hostile structures are not going to move.
        // If the target structure is destroyed, we will return false and calculate a new path.
        if (leader.memory.leaderTargetId && Game.time - leader.memory.leaderTargetTime < 50) {
            var target = Game.getObjectById<Structure>(leader.memory.leaderTargetId);
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

    function findTarget(leader: Creep, myCreeps: Creep[]): Structure {
        // Our army wants to destroy towers and spawns. It will do whatever it can to reach a tower or
        // spawn as quickly as possible. This may involve using an existing path or it may involve
        // making a path by destroying obstacles, whichever is estimated to be faster. We need to choose
        // a target based on how threatening that target is and how long it will take to get there.
        // We will choose a path using a custom cost matrix which treats hostile structures as walkable
        // spaces with cost equal to the estimated time to break that structure.
        var costMatrix = getCostMatrix(leader.room.name);
        var myDamageOutput: number = _.sum(myCreeps, getDamageOutput);
        var targets = leader.room.find<Structure>(FIND_HOSTILE_STRUCTURES, {
            filter: o => o.structureType === STRUCTURE_TOWER
                || o.structureType === STRUCTURE_STORAGE
                || o.structureType === STRUCTURE_SPAWN
        });
        var valueData = targets.map(o => getTargetValue(o, costMatrix));
        return util.getBestValue(valueData);

        function getTargetValue(target: Structure, costMatrix: CostMatrix): util.ValueData<Structure> {
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

        function findWalkablePath(start: RoomPosition, target: Structure) {
            return start.findPathTo(target, {
                ignoreCreeps: true,
                maxRooms: 1,
                range: 1
            });
        }

        function findBreakablePath(start: RoomPosition, target: Structure, costMatrix: CostMatrix) {
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

        function estimateTimeToTraversePath(path: PathStep[]) {
            if (!path || !path.length) return -1;
            var walkTime = path.length * 3;
            var obstacles = getObstaclesInPath(path);
            var breakTime = _.sum(obstacles, o => o.hits) / myDamageOutput;
            return walkTime + breakTime;
        }

        function getObstaclesInPath(path: PathStep[]): Structure[] {
            var room = leader.room;
            var obstacles: Structure[] = [];
            for (let i in path) {
                var step = path[i];
                obstacles = obstacles.concat(room.lookForAt<Structure>(LOOK_STRUCTURES, step.x, step.y));
            }
            return obstacles;
        }

        function getPriorityOfTarget(target: Structure, estimatedTimeToReach: number) {
            if (estimatedTimeToReach === -1) return 0;
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

    function getCostMatrix(roomName: string) {
        var room = Game.rooms[roomName];
        var costMatrix = new PathFinder.CostMatrix;
        var walls = room.find<StructureWall | Rampart>(FIND_HOSTILE_STRUCTURES, {
            filter: (o: Structure) => o.structureType === STRUCTURE_WALL || o.structureType === STRUCTURE_RAMPART
        });
        if (walls.length) {
            var maxHits: number = _.sortBy(walls.map(o => o.hits), o => -o)[0];
            var multiplier = 254 / maxHits;
            for (let i in walls) {
                var wall = walls[i];
                costMatrix.set(wall.pos.x, wall.pos.y, Math.floor(wall.hits * multiplier));
            }
        }
        return costMatrix;
    }

    function getDamageOutput(creep: Creep) {
        return (creep.getActiveBodyparts(ATTACK) * 30) + (creep.getActiveBodyparts(RANGED_ATTACK) * 10);
    }
}