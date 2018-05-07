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
function setMoveTarget(creep, target, desiredDistance) {
    creep.memory.moveTargetId = target ? target.id : null;
    creep.memory.moveTargetDesiredDistance = desiredDistance;
    if (target) {
        creep.moveTo(target, { visualizePathStyle: { stroke: '#fff' } });
    }
}
exports.setMoveTarget = setMoveTarget;
function isAtMoveTarget(creep) {
    const moveTarget = Game.getObjectById(creep.memory.moveTargetId);
    return moveTarget && (creep.pos === moveTarget.pos || creep.pos.inRangeTo(moveTarget.pos, creep.memory.moveTargetDesiredDistance || 1));
}
exports.isAtMoveTarget = isAtMoveTarget;
function moveToMoveTarget(creep) {
    const moveTarget = Game.getObjectById(creep.memory.moveTargetId);
    if (moveTarget) {
        if (isAtMoveTarget(creep)) {
            setMoveTarget(creep, null);
        }
        else {
            var isWorker = isCreepWorker(creep);
            creep.moveTo(moveTarget, {
                visualizePathStyle: { stroke: '#fff' },
                //ignoreCreeps: isWorker,
                reusePath: isWorker ? 25 : 5
            });
            return true;
        }
    }
    else {
        setMoveTarget(creep, null);
    }
    return false;
}
exports.moveToMoveTarget = moveToMoveTarget;
function isCreepWorker(creep) {
    var role = creep.memory.role;
    return role === 'harvester' || role === 'transporter' || role === 'builder' || role === 'claimer';
}
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
    const extensions = spawn.room.find(FIND_STRUCTURES, { filter: o => o.structureType == STRUCTURE_EXTENSION && o.energy < o.energyCapacity });
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
//# sourceMappingURL=util.js.map