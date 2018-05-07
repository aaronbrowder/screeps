export interface ValueData<T> {
    target: T;
    value: number;
}

export function getBestValue<T>(valueData: Array<ValueData<T>>): T {
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

export function filter<T>(items: T[], func: (o: T) => boolean): T[] {
    return _.filter(items, func);
}

export function setMoveTarget(creep: Creep, target: Creep | Structure | ConstructionSite | Source, desiredDistance?: number) {
    creep.memory.moveTargetId = target ? target.id : null;
    creep.memory.moveTargetFlagName = null;
    creep.memory.moveTargetDesiredDistance = desiredDistance;
    if (target) {
        creep.moveTo(target, { visualizePathStyle: { stroke: '#fff' } });
    }
}

export function setMoveTargetFlag(creep: Creep, target: Flag, desiredDistance?: number) {
    creep.memory.moveTargetId = null;
    creep.memory.moveTargetFlagName = target ? target.name : null;
    creep.memory.moveTargetDesiredDistance = desiredDistance;
    if (target) {
        creep.moveTo(target, { visualizePathStyle: { stroke: '#fff' } });
    }
}

export function isAtMoveTarget(creep: Creep) {
    const desiredDistance = creep.memory.moveTargetDesiredDistance || 1;
    const target = creep.memory.moveTargetId
        ? Game.getObjectById<RoomObject>(creep.memory.moveTargetId)
        : Game.flags[creep.memory.moveTargetFlagId];
    if (target) {
        return target && (desiredDistance >= 100 || creep.pos === target.pos || creep.pos.inRangeTo(target.pos, desiredDistance));
    }
    return false;
}

export function moveToMoveTarget(creep: Creep) {
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
        ? Game.getObjectById<RoomObject>(creep.memory.moveTargetId)
        : Game.flags[creep.memory.moveTargetFlagId];
    if (target) {
        creep.moveTo(target, options);
        return true;
    }
    setMoveTarget(creep, null);
    return false;
}

export function findHubFlag(room: Room) {
    if (!room) return null;
    return room.find<Flag>(FIND_FLAGS, { filter: (o: Flag) => o.name.startsWith('Hub') })[0];
}

function isCreepWorker(creep: Creep) {
    var role = creep.memory.role;
    return role === 'harvester' || role === 'transporter' || role === 'builder' || role === 'claimer';
}

export function isCreepRemote(creep: Creep) {
    return creep.memory.assignedRoomName !== creep.memory.homeRoomName;
}

function findNearestObject(pos, findType, filter) {
    return pos.findClosestByRange(findType, { filter: filter });
}

export function findNearestStructure(pos, type, maxRange?) {
    return findNearestObject(pos, FIND_STRUCTURES, function (structure) {
        return structure.structureType == type && (!maxRange || structure.pos.inRangeTo(pos, maxRange));
    });
}

export function transferTo(creep, target) {
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

export function deliverToSpawn(creep, spawn) {
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

export function goToRecycle(creep) {
    var homeRoom = Game.rooms[creep.memory.homeRoomName];
    const spawn = homeRoom.find<Spawn>(FIND_MY_SPAWNS)[0];
    if (spawn) {
        setMoveTarget(creep, spawn);
        spawn.recycleCreep(creep);
        return true;
    }
    return false;
}

export function signController(creep: Creep, target: Controller) {
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

export function countCreeps(role, filter?) {
    var count = 0;
    for (var i in Game.creeps) {
        if ((!role || Game.creeps[i].memory.role === role) && (!filter || filter(Game.creeps[i]))) count++;
    }
    return count;
}

export function isWartime(room) {
    var hostiles = room.find(FIND_HOSTILE_CREEPS, { filter: o => o.body.some(p => p.type == ATTACK || p.type == RANGED_ATTACK) });
    return !!hostiles.length;
}

export function refreshSpawn(roomName) {
    var roomMemory = Memory.rooms[roomName] || {};
    roomMemory.doRefreshSpawn = true;
    Memory.rooms[roomName] = roomMemory;
}

export function getEmptySpace(structure: Structure) {
    if (isLink(structure) || isTower(structure) || isExtension(structure) || isSpawn(structure)) {
        return structure.energyCapacity - structure.energy;
    }
    if (isContainer(structure) || isStorage(structure)) {
        return structure.storeCapacity - _.sum(structure.store);
    }
    return 0;
}

export function isNumber(x: any): x is number {
    return typeof x === "number";
}

export function isSpawn(structure: Structure): structure is StructureSpawn {
    return structure.structureType === STRUCTURE_SPAWN;
}

export function isExtension(structure: Structure): structure is StructureExtension {
    return structure.structureType === STRUCTURE_EXTENSION;
}

export function isTower(structure: Structure): structure is StructureTower {
    return structure.structureType === STRUCTURE_TOWER;
}

export function isContainer(structure: Structure): structure is StructureContainer {
    return structure.structureType === STRUCTURE_CONTAINER;
}

export function isStorage(structure: Structure): structure is StructureStorage {
    return structure.structureType === STRUCTURE_STORAGE;
}

export function isLink(structure: Structure): structure is StructureLink {
    return structure.structureType === STRUCTURE_LINK;
}

export function isExtractor(structure: Structure): structure is StructureExtractor {
    return structure.structureType === STRUCTURE_EXTRACTOR;
}

export function isController(structure: Structure): structure is StructureController {
    return structure.structureType === STRUCTURE_CONTROLLER;
}

export function isStructure(o: Structure | ConstructionSite): o is Structure {
    return o['hitsMax'] || o.structureType === STRUCTURE_CONTROLLER;
}

export function findLinks(room: Room) {
    return room.find<StructureLink>(FIND_MY_STRUCTURES, { filter: (o: Structure) => o.structureType === STRUCTURE_LINK });
}

export function isSource(sourceOrMineral: Source | Mineral): sourceOrMineral is Source {
    return !!sourceOrMineral['energyCapacity'];
}

export function isSourceActive(source: Source) {
    return _.filter(source.pos.findInRange(FIND_STRUCTURES, 2), o => isContainer(o) || isLink(o)).length > 0;
}

export function isMineralActive(mineral: Mineral) {
    return mineral.mineralAmount > 0
        && _.filter(mineral.pos.findInRange(FIND_STRUCTURES, 2), o => isContainer(o)).length
        && _.filter(mineral.pos.lookFor(LOOK_STRUCTURES), o => isExtractor(o)).length;
}

export function countBodyParts(body: string[], type: string) {
    return _.filter(body, (o: string) => o.toLowerCase() === type.toLowerCase()).length;
}