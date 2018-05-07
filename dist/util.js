"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getBestValue(valueData) {
    var best = null;
    var bestValue = -10000;
    for (let i in valueData) {
        const item = valueData[i];
        if (item.value > bestValue) {
            bestValue = item.value;
            best = item.target;
        }
    }
    return best;
}
exports.getBestValue = getBestValue;
function filter(items, func) {
    return _.filter(items, func);
}
exports.filter = filter;
function setMoveTarget(creep, target, desiredDistance) {
    creep.memory.moveTargetId = target ? target.id : null;
    creep.memory.moveTargetFlagName = null;
    creep.memory.moveTargetDesiredDistance = desiredDistance;
    if (target) {
        creep.moveTo(target, { visualizePathStyle: { stroke: '#fff' } });
    }
}
exports.setMoveTarget = setMoveTarget;
function setMoveTargetFlag(creep, target, desiredDistance) {
    creep.memory.moveTargetId = null;
    creep.memory.moveTargetFlagName = target ? target.name : null;
    creep.memory.moveTargetDesiredDistance = desiredDistance;
    if (target) {
        creep.moveTo(target, { visualizePathStyle: { stroke: '#fff' } });
    }
}
exports.setMoveTargetFlag = setMoveTargetFlag;
function isAtMoveTarget(creep) {
    const desiredDistance = creep.memory.moveTargetDesiredDistance || 1;
    const target = creep.memory.moveTargetId
        ? Game.getObjectById(creep.memory.moveTargetId)
        : Game.flags[creep.memory.moveTargetFlagId];
    if (target) {
        return target && (desiredDistance >= 100 || creep.pos === target.pos || creep.pos.inRangeTo(target.pos, desiredDistance));
    }
    return false;
}
exports.isAtMoveTarget = isAtMoveTarget;
function moveToMoveTarget(creep) {
    if (isAtMoveTarget(creep)) {
        setMoveTarget(creep, null);
        return false;
    }
    //const hubFlag = findHubFlag(creep.room);
    const options = {
        visualizePathStyle: { stroke: '#fff' },
        reusePath: isCreepWorker(creep) ? (isCreepRemote(creep) ? 30 : 15) : 5
        //ignoreCreeps: isWorker,
        //avoid: [hubFlag]
    };
    const target = creep.memory.moveTargetId
        ? Game.getObjectById(creep.memory.moveTargetId)
        : Game.flags[creep.memory.moveTargetFlagId];
    if (target) {
        creep.moveTo(target, options);
        return true;
    }
    setMoveTarget(creep, null);
    return false;
}
exports.moveToMoveTarget = moveToMoveTarget;
function findHubFlag(room) {
    if (!room)
        return null;
    return room.find(FIND_FLAGS, { filter: (o) => o.name.startsWith('Hub') })[0];
}
exports.findHubFlag = findHubFlag;
function isCreepWorker(creep) {
    var role = creep.memory.role;
    return role === 'harvester' || role === 'transporter' || role === 'builder' || role === 'claimer';
}
function isCreepRemote(creep) {
    return creep.memory.assignedRoomName !== creep.memory.homeRoomName;
}
exports.isCreepRemote = isCreepRemote;
function findNearestObject(pos, findType, filter) {
    return pos.findClosestByRange(findType, { filter: filter });
}
function findNearestStructure(pos, type, maxRange) {
    return findNearestObject(pos, FIND_STRUCTURES, function (structure) {
        return structure.structureType == type && (!maxRange || structure.pos.inRangeTo(pos, maxRange));
    });
}
exports.findNearestStructure = findNearestStructure;
function transferTo(creep, target) {
    for (const resource in creep.carry) {
        if (creep.carry[resource] > 0) {
            var transferResult = creep.transfer(target, resource);
            if (transferResult == ERR_NOT_IN_RANGE) {
                setMoveTarget(creep, target, 1);
            }
            else if (transferResult === OK && (target.structureType === STRUCTURE_EXTENSION || target.structureType === STRUCTURE_SPAWN)) {
                refreshSpawn(target.room.name);
            }
            return true;
        }
    }
    return false;
}
exports.transferTo = transferTo;
function deliverToSpawn(creep, spawn) {
    if (spawn.energy < spawn.energyCapacity) {
        transferTo(creep, spawn);
        return true;
    }
    const extensions = spawn.room.find(FIND_MY_STRUCTURES, { filter: o => o.structureType == STRUCTURE_EXTENSION && o.energy < o.energyCapacity });
    if (extensions.length) {
        transferTo(creep, extensions[0]);
        return true;
    }
    return false;
}
exports.deliverToSpawn = deliverToSpawn;
function goToRecycle(creep) {
    var homeRoom = Game.rooms[creep.memory.homeRoomName];
    const spawn = homeRoom.find(FIND_MY_SPAWNS)[0];
    if (spawn) {
        setMoveTarget(creep, spawn);
        spawn.recycleCreep(creep);
        return true;
    }
    return false;
}
exports.goToRecycle = goToRecycle;
function signController(creep, target) {
    var username = _.find(Game.structures).owner.username;
    if (!target.sign || target.sign.username !== username) {
        const result = creep.signController(target, 'Unholy Kingdom of Z');
        if (result === ERR_NOT_IN_RANGE) {
            setMoveTarget(creep, target, 1);
        }
        return true;
    }
    return false;
}
exports.signController = signController;
function countCreeps(role, filter) {
    var count = 0;
    for (var i in Game.creeps) {
        if ((!role || Game.creeps[i].memory.role === role) && (!filter || filter(Game.creeps[i])))
            count++;
    }
    return count;
}
exports.countCreeps = countCreeps;
function isWartime(room) {
    var hostiles = room.find(FIND_HOSTILE_CREEPS, { filter: o => o.body.some(p => p.type == ATTACK || p.type == RANGED_ATTACK) });
    return !!hostiles.length;
}
exports.isWartime = isWartime;
function refreshSpawn(roomName) {
    var roomMemory = Memory.rooms[roomName] || {};
    roomMemory.doRefreshSpawn = true;
    Memory.rooms[roomName] = roomMemory;
}
exports.refreshSpawn = refreshSpawn;
function getEmptySpace(structure) {
    if (isLink(structure) || isTower(structure) || isExtension(structure) || isSpawn(structure)) {
        return structure.energyCapacity - structure.energy;
    }
    if (isContainer(structure) || isStorage(structure)) {
        return structure.storeCapacity - _.sum(structure.store);
    }
    return 0;
}
exports.getEmptySpace = getEmptySpace;
function isNumber(x) {
    return typeof x === "number";
}
exports.isNumber = isNumber;
function isSpawn(structure) {
    return structure.structureType === STRUCTURE_SPAWN;
}
exports.isSpawn = isSpawn;
function isExtension(structure) {
    return structure.structureType === STRUCTURE_EXTENSION;
}
exports.isExtension = isExtension;
function isTower(structure) {
    return structure.structureType === STRUCTURE_TOWER;
}
exports.isTower = isTower;
function isContainer(structure) {
    return structure.structureType === STRUCTURE_CONTAINER;
}
exports.isContainer = isContainer;
function isStorage(structure) {
    return structure.structureType === STRUCTURE_STORAGE;
}
exports.isStorage = isStorage;
function isLink(structure) {
    return structure.structureType === STRUCTURE_LINK;
}
exports.isLink = isLink;
function isExtractor(structure) {
    return structure.structureType === STRUCTURE_EXTRACTOR;
}
exports.isExtractor = isExtractor;
function isController(structure) {
    return structure.structureType === STRUCTURE_CONTROLLER;
}
exports.isController = isController;
function isStructure(o) {
    return o['hitsMax'] || o.structureType === STRUCTURE_CONTROLLER;
}
exports.isStructure = isStructure;
function findLinks(room) {
    return room.find(FIND_MY_STRUCTURES, { filter: (o) => o.structureType === STRUCTURE_LINK });
}
exports.findLinks = findLinks;
function isSource(sourceOrMineral) {
    return !!sourceOrMineral['energyCapacity'];
}
exports.isSource = isSource;
function isSourceActive(source) {
    return _.filter(source.pos.findInRange(FIND_STRUCTURES, 2), o => isContainer(o) || isLink(o)).length > 0;
}
exports.isSourceActive = isSourceActive;
function isMineralActive(mineral) {
    return mineral.mineralAmount > 0
        && _.filter(mineral.pos.findInRange(FIND_STRUCTURES, 2), o => isContainer(o)).length
        && _.filter(mineral.pos.lookFor(LOOK_STRUCTURES), o => isExtractor(o)).length;
}
exports.isMineralActive = isMineralActive;
function countBodyParts(body, type) {
    return _.filter(body, (o) => o.toLowerCase() === type.toLowerCase()).length;
}
exports.countBodyParts = countBodyParts;
//# sourceMappingURL=util.js.map