"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const map = require("./map");
const util = require("./util");
const builderAssignment = require("./assignment.builder");
var logId = '';
function run(creep) {
    var username = _.find(Game.structures).owner.username;
    var room = Game.rooms[creep.memory.assignedRoomName];
    var controller = room.controller;
    // the builder needs to be in its assigned room, otherwise algorithms that search for the closest thing will not work
    if (creep.room.name !== creep.memory.assignedRoomName) {
        map.navigateToRoom(creep, creep.memory.assignedRoomName);
        return;
    }
    if (creep.memory.subRole === 'colonist' && controller && !controller.my) {
        var hasClaimParts = _.filter(creep.body, o => o.type === CLAIM).length;
        if (!hasClaimParts)
            return;
        if (controller.owner) {
            if (creep.attackController(controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller);
            }
        }
        else {
            if (util.signController(creep, controller))
                return;
            creep.moveTo(controller);
            var claimResult = creep.claimController(controller);
            if (claimResult === ERR_GCL_NOT_ENOUGH || claimResult === ERR_FULL) {
                creep.reserveController(controller);
            }
        }
        return;
    }
    if (creep.memory.isCollecting) {
        collect();
    }
    else if (creep.carry.energy > 0) {
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
        const containers = room.find(FIND_STRUCTURES, {
            filter: o => (o.structureType === STRUCTURE_CONTAINER || o.structureType === STRUCTURE_STORAGE) && o.store[RESOURCE_ENERGY] > 0
        }).map(o => {
            return { target: o, value: getStoreValue(o) };
        });
        const sources = room.find(FIND_SOURCES, { filter: o => o.energy > 0 }).map(o => {
            return { target: o, value: getSourceValue(o) };
        });
        const targets = _.filter(containers.concat(sources), o => o.value > -1000);
        return util.getBestValue(targets);
        function getStoreValue(store) {
            var value = getCollectTargetValue(store, o => o.store[RESOURCE_ENERGY]) + 5;
            // don't collect from storage except when there are construction sites or in consumption mode
            var consumptionMode = util.getRoomMemory(creep.memory.assignedRoomName).consumptionMode;
            if (store.structureType === STRUCTURE_STORAGE && !constructionSites.length && !consumptionMode) {
                value -= 100000;
            }
            return value;
        }
        function getSourceValue(source) {
            var value = getCollectTargetValue(source, o => o.energy);
            if (value === 0)
                return 0;
            const harvesters = source.pos.findInRange(FIND_MY_CREEPS, 2, { filter: o => o.memory.role === 'harvester' });
            if (harvesters.length === 1)
                return value - 15;
            else if (harvesters.length > 1)
                return -1000;
            return value;
        }
        function getCollectTargetValue(target, energyFunc) {
            var value = 10 * Math.min(1, energyFunc(target) / (creep.carryCapacity - creep.carry.energy));
            const path = creep.pos.findPathTo(target.pos);
            if (!path)
                return -1000;
            return value - path.length;
        }
    }
    function deliver() {
        // make sure the builder is not right next to an energy source, blocking it from being used by other creeps
        var nearbySource = creep.pos.findInRange(FIND_SOURCES, 1)[0];
        var spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
        if (nearbySource && spawn) {
            creep.moveTo(spawn);
            return;
        }
        // if there are no harvesters in this room or no transporters, the builder should deliver to the spawn
        var hasHarvesters = !!room.find(FIND_MY_CREEPS, { filter: o => o.memory.role === 'harvester' }).length;
        var hasTransporters = !!room.find(FIND_MY_CREEPS, { filter: o => o.memory.role === 'transporter' }).length;
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
            // no assignment -- either upgrade controller or build up walls depending on role
            // (clear assignment id just in case the assignment was destroyed or the creep left the room)
            creep.memory.assignmentId = null;
            if (creep.memory.subRole === 'upgrader') {
                upgradeController(controller);
            }
            else {
                const wall = findPreferredWall();
                if (wall)
                    buildUpWall(wall);
            }
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
            const walls = room.find(FIND_STRUCTURES, {
                filter: o => (o.structureType === STRUCTURE_WALL || o.structureType === STRUCTURE_RAMPART) && o.hits < o.hitsMax
            });
            if (walls.length) {
                for (let hits = 1000; hits <= 1000000; hits *= 10) {
                    const wall = creep.pos.findClosestByPath(walls, { filter: o => o.hits < hits });
                    if (wall) {
                        creep.memory.preferredWallId = wall.id;
                        return wall;
                    }
                }
                // after reaching 1 million, go up in increments of 1 million until we get to 100 million
                for (let hits = 2000000; hits <= 100000000; hits += 1000000) {
                    const wall = creep.pos.findClosestByPath(walls, { filter: o => o.hits < hits });
                    if (wall) {
                        creep.memory.preferredWallId = wall.id;
                        return wall;
                    }
                }
            }
            return null;
        }
    }
}
exports.run = run;
//# sourceMappingURL=role.worker.builder.js.map