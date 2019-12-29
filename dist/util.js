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
function firstOrDefault(items, func) {
    const results = _.filter(items, func);
    if (results.length) {
        return results[0];
    }
    return null;
}
exports.firstOrDefault = firstOrDefault;
function any(items, func) {
    return _.filter(items, func).length > 0;
}
exports.any = any;
function sortBy(items, func) {
    return _.sortBy(items, func);
}
exports.sortBy = sortBy;
function sum(items, func) {
    return _.sum(items, func);
}
exports.sum = sum;
function count(items, func) {
    return filter(items, func).length;
}
exports.count = count;
function max(items, func) {
    return Math.max.apply(null, items.map(func));
}
exports.max = max;
function setMoveTarget(creep, target, desiredDistance, moveImmediately) {
    if (moveImmediately === undefined) {
        moveImmediately = true;
    }
    creep.memory.moveTargetId = target ? target.id : null;
    creep.memory.moveTargetFlagName = null;
    creep.memory.moveTargetDesiredDistance = desiredDistance;
    if (moveImmediately && target) {
        moveToMoveTarget(creep);
    }
}
exports.setMoveTarget = setMoveTarget;
function setMoveTargetFlag(creep, target, desiredDistance) {
    creep.memory.moveTargetId = null;
    creep.memory.moveTargetFlagName = target ? target.name : null;
    creep.memory.moveTargetDesiredDistance = desiredDistance;
    if (target) {
        creep.moveTo(target, getMoveOptions(creep));
    }
}
exports.setMoveTargetFlag = setMoveTargetFlag;
function getMoveOptions(creep) {
    var reusePath = 5;
    var waveMates = [];
    if (isCreepWorker(creep)) {
        reusePath = isCreepRemote(creep) ? 30 : 15;
    }
    if (creep.memory.moveTargetFlagId && !creep.memory.moveTargetId) {
        reusePath = 25;
    }
    if (creep.memory.raidWaveId) {
        waveMates = creep.room.find(FIND_MY_CREEPS, { filter: o => o.memory.raidWaveId === creep.memory.raidWaveId });
    }
    return {
        visualizePathStyle: { stroke: '#fff' },
        reusePath: reusePath,
    };
}
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
    const target = creep.memory.moveTargetId
        ? Game.getObjectById(creep.memory.moveTargetId)
        : Game.flags[creep.memory.moveTargetFlagId];
    if (target) {
        creep.moveTo(target, getMoveOptions(creep));
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
function findSpawns(roomName, maxDistanceToSearch, distance) {
    distance = distance || 0;
    if (distance > maxDistanceToSearch)
        return [];
    const spawnsAtMinDistance = _.filter(Game.spawns, (o) => {
        return Game.map.getRoomLinearDistance(o.room.name, roomName) === distance;
    });
    if (!spawnsAtMinDistance.length) {
        return findSpawns(roomName, maxDistanceToSearch, distance + 1);
    }
    // always search at the desired distance plus 1, in case there is a shorter route through a greater number of rooms
    const maxDistance = Math.min(distance + 1, maxDistanceToSearch);
    const spawns = _.filter(Game.spawns, (o) => {
        const d = Game.map.getRoomLinearDistance(o.room.name, roomName);
        return d >= distance && d <= maxDistance;
    });
    return sortBy(spawns, o => Game.map.getRoomLinearDistance(o.room.name, roomName));
}
exports.findSpawns = findSpawns;
function findRoomsForSpawning(roomName, maxDistanceToSearch, distance) {
    const spawns = findSpawns(roomName, maxDistanceToSearch, distance);
    const rooms = [];
    for (let i = 0; i < spawns.length; i++) {
        if (rooms.findIndex(o => o.name === spawns[i].room.name) === -1) {
            rooms.push(spawns[i].room);
        }
    }
    return rooms;
}
exports.findRoomsForSpawning = findRoomsForSpawning;
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
    for (const carry in creep.store) {
        const resource = carry;
        if (creep.store[resource] > 0) {
            var transferResult = creep.transfer(target, resource);
            if (transferResult == ERR_NOT_IN_RANGE) {
                setMoveTarget(creep, target, 1);
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
    const extensions = spawn.room.find(FIND_MY_STRUCTURES, {
        filter: o => isExtension(o) && o.energy < o.energyCapacity
    });
    if (extensions.length) {
        transferTo(creep, extensions[0]);
        return true;
    }
    return false;
}
exports.deliverToSpawn = deliverToSpawn;
function goToRecycle(creep) {
    const spawns = findSpawns(creep.room.name, 2);
    if (spawns.length) {
        setMoveTarget(creep, spawns[0]);
        spawns[0].recycleCreep(creep);
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
function getThreatLevel(room) {
    const hostileCreeps = room.find(FIND_HOSTILE_CREEPS, {
        filter: (o) => o.getActiveBodyparts(ATTACK) > 0 || o.getActiveBodyparts(RANGED_ATTACK) > 0
    });
    if (!hostileCreeps.length)
        return 0;
    // normalize the threat level so that a threat level of 1 means 1 attack part
    return (1 / 80) * sum(hostileCreeps, o => (80 * o.getActiveBodyparts(ATTACK)) +
        (150 * o.getActiveBodyparts(RANGED_ATTACK)) +
        (10 * o.getActiveBodyparts(TOUGH)) +
        (250 * o.getActiveBodyparts(HEAL)));
}
exports.getThreatLevel = getThreatLevel;
function refreshOrders(roomName) {
    modifyRoomMemory(roomName, o => {
        o.order = null;
        o.sourceOrders = null;
    });
}
exports.refreshOrders = refreshOrders;
function recycle(creep) {
    if (!creep.memory.markedForRecycle) {
        creep.memory.markedForRecycle = true;
        refreshOrders(creep.memory.assignedRoomName);
    }
}
exports.recycle = recycle;
function getRoomMemory(roomName) {
    return Memory.rooms[roomName] || {};
}
exports.getRoomMemory = getRoomMemory;
function modifyRoomMemory(roomName, fn) {
    const roomMemory = getRoomMemory(roomName);
    fn(roomMemory);
    Memory.rooms[roomName] = roomMemory;
}
exports.modifyRoomMemory = modifyRoomMemory;
function getSpawnMemory(spawn) {
    return spawn.memory;
}
exports.getSpawnMemory = getSpawnMemory;
function modifySpawnMemory(spawn, fn) {
    const spawnMemory = getSpawnMemory(spawn);
    fn(spawnMemory);
    spawn.memory = spawnMemory;
}
exports.modifySpawnMemory = modifySpawnMemory;
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
function getConsumptionModeBoundaries(room) {
    if (room.controller.level < 5) {
        return { lower: 100000, upper: 150000 };
    }
    if (room.controller.level < 6) {
        return { lower: 300000, upper: 350000 };
    }
    if (room.controller.level < 7) {
        return { lower: 600000, upper: 650000 };
    }
    return { lower: 900000, upper: 950000 };
}
exports.getConsumptionModeBoundaries = getConsumptionModeBoundaries;
function isNumber(x) {
    return typeof x === "number";
}
exports.isNumber = isNumber;
function isSpawn(structure) {
    return structure && structure.structureType === STRUCTURE_SPAWN;
}
exports.isSpawn = isSpawn;
function isExtension(structure) {
    return structure && structure.structureType === STRUCTURE_EXTENSION;
}
exports.isExtension = isExtension;
function isTower(structure) {
    return structure && structure.structureType === STRUCTURE_TOWER;
}
exports.isTower = isTower;
function isContainer(structure) {
    return structure && structure.structureType === STRUCTURE_CONTAINER;
}
exports.isContainer = isContainer;
function isStorage(structure) {
    return structure && structure.structureType === STRUCTURE_STORAGE;
}
exports.isStorage = isStorage;
function isLink(structure) {
    return structure && structure.structureType === STRUCTURE_LINK;
}
exports.isLink = isLink;
function isExtractor(structure) {
    return structure && structure.structureType === STRUCTURE_EXTRACTOR;
}
exports.isExtractor = isExtractor;
function isController(structure) {
    return structure && structure.structureType === STRUCTURE_CONTROLLER;
}
exports.isController = isController;
function isTerminal(structure) {
    return structure && structure.structureType === STRUCTURE_TERMINAL;
}
exports.isTerminal = isTerminal;
function isRampart(structure) {
    return structure && structure.structureType === STRUCTURE_RAMPART;
}
exports.isRampart = isRampart;
function isWall(structure) {
    return structure && structure.structureType === STRUCTURE_WALL;
}
exports.isWall = isWall;
function isStructure(o) {
    return o && o['hitsMax'] || o.structureType === STRUCTURE_CONTROLLER;
}
exports.isStructure = isStructure;
function findLinks(room) {
    return room.find(FIND_MY_STRUCTURES, { filter: (o) => o.structureType === STRUCTURE_LINK });
}
exports.findLinks = findLinks;
function isSource(sourceOrMineral) {
    return sourceOrMineral && !!sourceOrMineral['energyCapacity'];
}
exports.isSource = isSource;
function isSourceActive(source) {
    return filter(source.pos.findInRange(FIND_STRUCTURES, 2), o => isContainer(o) || isLink(o)).length > 0;
}
exports.isSourceActive = isSourceActive;
function isMineralActive(mineral) {
    return mineral.mineralAmount > 0
        && filter(mineral.pos.findInRange(FIND_STRUCTURES, 2), o => isContainer(o)).length
        && filter(mineral.pos.lookFor(LOOK_STRUCTURES), o => isExtractor(o)).length;
}
exports.isMineralActive = isMineralActive;
function countBodyParts(body, type) {
    return filter(body, o => o.toLowerCase() === type.toLowerCase()).length;
}
exports.countBodyParts = countBodyParts;
function isWorkerRole(role) {
    return role === 'builder' || role === 'harvester' || role === 'transporter' || role === 'hub';
}
exports.isWorkerRole = isWorkerRole;
function countSurroundingWalls(pos) {
    var count = 0;
    if (isWallAt(pos.x, pos.y + 1))
        count++;
    if (isWallAt(pos.x + 1, pos.y + 1))
        count++;
    if (isWallAt(pos.x + 1, pos.y))
        count++;
    if (isWallAt(pos.x + 1, pos.y - 1))
        count++;
    if (isWallAt(pos.x, pos.y - 1))
        count++;
    if (isWallAt(pos.x - 1, pos.y - 1))
        count++;
    if (isWallAt(pos.x - 1, pos.y))
        count++;
    if (isWallAt(pos.x - 1, pos.y + 1))
        count++;
    return count;
    function isWallAt(x, y) {
        return Game.map.getRoomTerrain(pos.roomName).get(x, y) === TERRAIN_MASK_WALL;
    }
}
exports.countSurroundingWalls = countSurroundingWalls;
//# sourceMappingURL=util.js.map