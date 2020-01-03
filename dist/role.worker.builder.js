"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const map = require("./map");
const util = require("./util");
const enums = require("./enums");
const modes = require("./util.modes");
const cache = require("./cache");
const builderAssignment = require("./assignment.builder");
const towerLogic = require("./structure.tower");
function run(creep) {
    var username = _.find(Game.structures).owner.username;
    var room = Game.rooms[creep.memory.assignedRoomName];
    var controller = room.controller;
    // the builder needs to be in its assigned room, otherwise algorithms that search for the closest thing will not work
    if (creep.room.name !== creep.memory.assignedRoomName) {
        map.navigateToRoom(creep, creep.memory.assignedRoomName);
        return;
    }
    if (creep.memory.isCollecting) {
        collect();
    }
    else if (creep.store[RESOURCE_ENERGY] > 0) {
        deliver();
    }
    function collect() {
        const target = findCollectTarget();
        if (target) {
            var result = creep.withdraw(target, RESOURCE_ENERGY);
            if (result === ERR_INVALID_TARGET) {
                result = creep.harvest(target);
            }
            if (result === ERR_NOT_IN_RANGE) {
                util.setMoveTarget(creep, target, 1);
            }
        }
    }
    function findCollectTarget() {
        const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
        const structures = room.find(FIND_STRUCTURES, {
            filter: o => (util.isContainer(o) || util.isStorage(o) || util.isLink(o)) && o.store[RESOURCE_ENERGY] > 0
        }).map(o => {
            return { target: o, value: getStructureValue(o) };
        });
        const sources = room.find(FIND_SOURCES, { filter: o => o.energy > 0 }).map(o => {
            return { target: o, value: getSourceValue(o) };
        });
        const targets = util.filter(structures.concat(sources), o => o.value > -1000);
        return util.getBestValue(targets);
        function getStructureValue(structure) {
            var value = getCollectTargetValue(structure, o => o.store[RESOURCE_ENERGY]) + 5;
            // don't collect from storage except when there are construction sites or in consumption mode
            var consumptionMode = util.getRoomMemory(creep.memory.assignedRoomName).consumptionMode;
            if (structure.structureType === STRUCTURE_STORAGE && !constructionSites.length && !consumptionMode) {
                value -= 100000;
            }
            return value;
        }
        function getSourceValue(source) {
            var value = getCollectTargetValue(source, o => o.energy);
            if (value === 0)
                return 0;
            const harvesters = source.pos.findInRange(FIND_MY_CREEPS, 2, { filter: o => o.memory.role === enums.HARVESTER });
            if (harvesters.length === 1)
                return value - 15;
            else if (harvesters.length > 1)
                return -1000;
            return value;
        }
        function getCollectTargetValue(target, energyFunc) {
            var value = 10 * Math.min(1, energyFunc(target) / (creep.store.getCapacity() - creep.store[RESOURCE_ENERGY]));
            const path = creep.pos.findPathTo(target.pos);
            if (!path)
                return -1000;
            return value - path.length;
        }
    }
    function deliver() {
        // make sure the builder is not right next to an energy source, blocking it from being used by other creeps
        var nearbySource = creep.pos.findInRange(FIND_SOURCES, 1)[0];
        if (nearbySource) {
            const goals = [{ pos: nearbySource.pos, range: 2 }];
            const fleeResult = PathFinder.search(creep.pos, goals, { flee: true });
            creep.move(creep.pos.getDirectionTo(fleeResult.path[0]));
            return;
        }
        // if there are no harvesters in this room or no transporters, the builder should deliver to the spawn
        var spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
        var hasHarvesters = !!room.find(FIND_MY_CREEPS, { filter: o => o.memory.role === enums.HARVESTER }).length;
        var hasTransporters = !!room.find(FIND_MY_CREEPS, { filter: o => o.memory.role === enums.TRANSPORTER }).length;
        if (spawn && (!hasHarvesters || !hasTransporters)) {
            if (util.deliverToSpawn(creep, spawn))
                return;
        }
        // deliver to assignment
        var assignment = Game.getObjectById(creep.memory.assignmentId);
        if (!assignment && creep.memory.assignmentId) {
            // reset the assignment and give it a tick to let the assignment module reassign
            creep.memory.assignmentId = null;
            return;
        }
        if (assignment) {
            if (util.isStructure(assignment)) {
                // assignment is a structure
                if (util.isController(assignment)) {
                    upgradeController(assignment);
                }
                else {
                    repairStructure(assignment);
                }
            }
            else {
                // assignment is a construction site
                buildStructure(assignment);
            }
        }
        else if (controller.my) {
            // no assignment -- either upgrade controller or build up walls depending on mode
            // (clear assignment id just in case the assignment was destroyed or the creep left the room)
            creep.memory.assignmentId = null;
            if (modes.getWallBuildMode(creep.room)) {
                const wall = findPreferredWall();
                if (wall) {
                    buildUpWall(wall);
                    return;
                }
            }
            upgradeController(controller);
        }
        function upgradeController(target) {
            if (creep.memory.assignmentId === target.id && target.level > 1 && !builderAssignment.isDowngrading(target)) {
                creep.memory.assignmentId = null;
                return;
            }
            if (util.signController(creep, target))
                return;
            if (creep.upgradeController(target) === ERR_NOT_IN_RANGE) {
                util.setMoveTarget(creep, target, 3);
            }
        }
        function buildUpWall(target) {
            if (target.hits === target.hitsMax) {
                creep.memory.preferredWallId = null;
            }
            else if (creep.repair(target) == ERR_NOT_IN_RANGE) {
                util.setMoveTarget(creep, target, 3);
            }
        }
        function repairStructure(target) {
            if (target.hits === target.hitsMax) {
                creep.memory.assignmentId = null;
            }
            else if (creep.repair(target) === ERR_NOT_IN_RANGE) {
                util.setMoveTarget(creep, target, 3);
            }
        }
        function buildStructure(target) {
            if (creep.build(target) === ERR_NOT_IN_RANGE) {
                util.setMoveTarget(creep, target, 3);
            }
        }
        function findPreferredWall() {
            if (creep.memory.preferredWallId) {
                var wall = Game.getObjectById(creep.memory.preferredWallId);
                if (wall)
                    return wall;
            }
            // In consumption mode only, if not all the walls are in tower range, we want to only
            // build up the walls not in tower range. If all walls ARE in tower range, or when NOT
            // in consumption mode, we can build up whichever walls we want.
            const consumptionMode = modes.getConsumptionMode(creep.room);
            const areAllWallsInTowerRange = cache.get('0947f8ac-dfa5-4609-870d-63cc483a51d9-' + room.name, 299, () => {
                let allWalls = room.find(FIND_STRUCTURES, {
                    filter: o => (util.isWall(o) || util.isRampart)
                });
                return !util.any(allWalls, o => o.pos.findInRange(FIND_MY_STRUCTURES, towerLogic.WALL_RANGE, {
                    filter: p => util.isTower(p)
                }).length === 0);
            });
            const canTargetWallsInTowerRange = areAllWallsInTowerRange || !consumptionMode;
            const targetHits = modes.getWallHitsTarget(creep.room);
            const preferredWall = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: o => (util.isWall(o) || util.isRampart(o)) &&
                    o.hits < targetHits &&
                    (canTargetWallsInTowerRange ||
                        !o.pos.findInRange(FIND_MY_STRUCTURES, towerLogic.WALL_RANGE, { filter: p => util.isTower(p) }).length)
            });
            if (preferredWall) {
                creep.memory.preferredWallId = preferredWall.id;
                return preferredWall;
            }
            return null;
        }
    }
}
exports.run = run;
//# sourceMappingURL=role.worker.builder.js.map