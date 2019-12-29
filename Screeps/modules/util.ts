
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

export function firstOrDefault<T>(items: T[], func: (o: T) => boolean): T {
    const results: T[] = _.filter(items, func);
    if (results.length) {
        return results[0];
    }
    return null;
}

export function any<T>(items: T[], func: (o: T) => boolean): boolean {
    return _.filter(items, func).length > 0;
}

export function sortBy<T>(items: T[], func: (o: T) => number): T[] {
    return _.sortBy(items, func);
}

export function sum<T>(items: T[], func: (o: T) => number): number {
    return _.sum(items, func);
}

export function count<T>(items: T[], func: (o: T) => boolean): number {
    return filter(items, func).length;
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
        creep.moveTo(target, {
            visualizePathStyle: { stroke: '#fff' },
            reusePath: 10
        });
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
    const options = {
        visualizePathStyle: { stroke: '#fff' },
        reusePath: isCreepWorker(creep) ? (isCreepRemote(creep) ? 30 : 15) : 5
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
    return room.find(FIND_FLAGS, { filter: (o: Flag) => o.name.startsWith('Hub') })[0];
}

export function findSpawns(roomName: string, maxDistanceToSearch: number, distance?: number): Array<StructureSpawn> {
    distance = distance || 0;
    if (distance > maxDistanceToSearch) return [];
    const spawnsAtMinDistance: StructureSpawn[] = _.filter(Game.spawns, (o: StructureSpawn) => {
        return Game.map.getRoomLinearDistance(o.room.name, roomName) === distance;
    });
    if (!spawnsAtMinDistance.length) {
        return findSpawns(roomName, maxDistanceToSearch, distance + 1);
    }
    // always search at the desired distance plus 1, in case there is a shorter route through a greater number of rooms
    const maxDistance = Math.min(distance + 1, maxDistanceToSearch);
    const spawns: StructureSpawn[] = _.filter(Game.spawns, (o: StructureSpawn) => {
        const d = Game.map.getRoomLinearDistance(o.room.name, roomName);
        return d >= distance && d <= maxDistance;
    });
    return sortBy(spawns, o => Game.map.getRoomLinearDistance(o.room.name, roomName));
}

export function findRoomsForSpawning(roomName: string, maxDistanceToSearch: number, distance?: number) {
    const spawns = findSpawns(roomName, maxDistanceToSearch, distance);
    const rooms: Array<Room> = [];
    for (let i = 0; i < spawns.length; i++) {
        if (rooms.findIndex(o => o.name === spawns[i].room.name) === -1) {
            rooms.push(spawns[i].room);
        }
    }
    return rooms;
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

export function transferTo(creep: Creep, target: Structure) {
    for (const carry in creep.store) {
        const resource = carry as ResourceConstant;
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

export function deliverToSpawn(creep: Creep, spawn: StructureSpawn) {
    if (spawn.energy < spawn.energyCapacity) {
        transferTo(creep, spawn);
        return true;
    }
    const extensions = spawn.room.find<Structure>(FIND_MY_STRUCTURES, {
        filter: o => isExtension(o) && o.energy < o.energyCapacity
    });
    if (extensions.length) {
        transferTo(creep, extensions[0]);
        return true;
    }
    return false;
}

export function goToRecycle(creep: Creep) {
    const spawns = findSpawns(creep.room.name, 2);
    if (spawns.length) {
        setMoveTarget(creep, spawns[0]);
        spawns[0].recycleCreep(creep);
        return true;
    }
    return false;
}

export function signController(creep: Creep, target: StructureController) {
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

export function countCreeps(role: string, filter?) {
    var count = 0;
    for (var i in Game.creeps) {
        if ((!role || Game.creeps[i].memory.role === role) && (!filter || filter(Game.creeps[i]))) count++;
    }
    return count;
}

export function getThreatLevel(room: Room) {
    const hostileCreeps = room.find(FIND_HOSTILE_CREEPS, {
        filter: (o: Creep) => o.getActiveBodyparts(ATTACK) > 0 || o.getActiveBodyparts(RANGED_ATTACK) > 0
    });
    if (!hostileCreeps.length) return 0;
    // normalize the threat level so that a threat level of 1 means 1 attack part
    return (1 / 80) * sum(hostileCreeps, o =>
        (80 * o.getActiveBodyparts(ATTACK)) +
        (150 * o.getActiveBodyparts(RANGED_ATTACK)) +
        (10 * o.getActiveBodyparts(TOUGH)) +
        (250 * o.getActiveBodyparts(HEAL)));
}

export function refreshOrders(roomName: string) {
    modifyRoomMemory(roomName, o => {
        o.order = null;
        o.sourceOrders = null;
    });
}

export function recycle(creep: Creep) {
    if (!creep.memory.markedForRecycle) {
        creep.memory.markedForRecycle = true;
        refreshOrders(creep.memory.assignedRoomName);
    }
}

export function getRoomMemory(roomName: string): RoomMemory {
    return Memory.rooms[roomName] || {} as RoomMemory;
}

export function modifyRoomMemory(roomName: string, fn: (roomMemory: RoomMemory) => void) {
    const roomMemory = getRoomMemory(roomName);
    fn(roomMemory);
    Memory.rooms[roomName] = roomMemory;
}

export function getSpawnMemory(spawn: StructureSpawn): SpawnMemory {
    return spawn.memory;
}

export function modifySpawnMemory(spawn: StructureSpawn, fn: (spawnMemory: SpawnMemory) => void) {
    const spawnMemory = getSpawnMemory(spawn);
    fn(spawnMemory);
    spawn.memory = spawnMemory;
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

interface ConsumptionModeBoundaries {
    lower: number;
    upper: number;
}

export function getConsumptionModeBoundaries(room: Room) {
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

export function isNumber(x: any): x is number {
    return typeof x === "number";
}

export function isSpawn(structure: Structure): structure is StructureSpawn {
    return structure && structure.structureType === STRUCTURE_SPAWN;
}

export function isExtension(structure: Structure): structure is StructureExtension {
    return structure && structure.structureType === STRUCTURE_EXTENSION;
}

export function isTower(structure: Structure): structure is StructureTower {
    return structure && structure.structureType === STRUCTURE_TOWER;
}

export function isContainer(structure: Structure): structure is StructureContainer {
    return structure && structure.structureType === STRUCTURE_CONTAINER;
}

export function isStorage(structure: Structure): structure is StructureStorage {
    return structure && structure.structureType === STRUCTURE_STORAGE;
}

export function isLink(structure: Structure): structure is StructureLink {
    return structure && structure.structureType === STRUCTURE_LINK;
}

export function isExtractor(structure: Structure): structure is StructureExtractor {
    return structure && structure.structureType === STRUCTURE_EXTRACTOR;
}

export function isController(structure: Structure): structure is StructureController {
    return structure && structure.structureType === STRUCTURE_CONTROLLER;
}

export function isTerminal(structure: Structure): structure is StructureTerminal {
    return structure && structure.structureType === STRUCTURE_TERMINAL;
}

export function isRampart(structure: Structure): structure is StructureRampart {
    return structure && structure.structureType === STRUCTURE_RAMPART;
}

export function isWall(structure: Structure): structure is StructureWall {
    return structure && structure.structureType === STRUCTURE_WALL;
}

export function isStructure(o: Structure | ConstructionSite): o is Structure {
    return o && o['hitsMax'] || o.structureType === STRUCTURE_CONTROLLER;
}

export function findLinks(room: Room) {
    return room.find<StructureLink>(FIND_MY_STRUCTURES, { filter: (o: Structure) => o.structureType === STRUCTURE_LINK });
}

export function isSource(sourceOrMineral: Source | Mineral): sourceOrMineral is Source {
    return sourceOrMineral && !!sourceOrMineral['energyCapacity'];
}

export function isSourceActive(source: Source) {
    return filter(source.pos.findInRange<Structure>(FIND_STRUCTURES, 2), o => isContainer(o) || isLink(o)).length > 0;
}

export function isMineralActive(mineral: Mineral) {
    return mineral.mineralAmount > 0
        && filter(mineral.pos.findInRange(FIND_STRUCTURES, 2), o => isContainer(o)).length
        && filter(mineral.pos.lookFor(LOOK_STRUCTURES), o => isExtractor(o)).length;
}

export function countBodyParts(body: string[], type: string): number {
    return filter(body, o => o.toLowerCase() === type.toLowerCase()).length;
}

export function isWorkerRole(role: string) {
    return role === 'builder' || role === 'harvester' || role === 'transporter' || role === 'hub';
}

export function countSurroundingWalls(pos: RoomPosition) {
    var count = 0;
    if (isWallAt(pos.x, pos.y + 1)) count++;
    if (isWallAt(pos.x + 1, pos.y + 1)) count++;
    if (isWallAt(pos.x + 1, pos.y)) count++;
    if (isWallAt(pos.x + 1, pos.y - 1)) count++;
    if (isWallAt(pos.x, pos.y - 1)) count++;
    if (isWallAt(pos.x - 1, pos.y - 1)) count++;
    if (isWallAt(pos.x - 1, pos.y)) count++;
    if (isWallAt(pos.x - 1, pos.y + 1)) count++;
    return count;

    function isWallAt(x: number, y: number) {
        return Game.map.getRoomTerrain(pos.roomName).get(x, y) === TERRAIN_MASK_WALL;
    }
}