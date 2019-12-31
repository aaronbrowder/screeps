import * as util from './util';

interface Bounds {
    lower: number;
    upper: number;
}

function getWallBuildModeBoundaries(room: Room): Bounds {
    if (room.controller.level <= 2) {
        return { lower: 7000, upper: 15000 };
    }
    if (room.controller.level <= 3) {
        return { lower: 60000, upper: 90000 };
    }
    if (room.controller.level <= 4) {
        return { lower: 800000, upper: 1200000 };
    }
    if (room.controller.level <= 5) {
        return { lower: 1800000, upper: 2200000 };
    }
    if (room.controller.level <= 6) {
        return { lower: 4500000, upper: 5500000 };
    }
    if (room.controller.level <= 7) {
        return { lower: 9500000, upper: 10500000 };
    }
    return { lower: 100000000, upper: 110000000 };
}

function getConsumptionModeBoundaries(room: Room): Bounds {
    if (room.controller.level <= 4) {
        return { lower: 100000, upper: 150000 };
    }
    if (room.controller.level <= 5) {
        return { lower: 250000, upper: 300000 };
    }
    if (room.controller.level <= 6) {
        return { lower: 500000, upper: 550000 };
    }
    if (room.controller.level <= 7) {
        return { lower: 700000, upper: 750000 };
    }
    return { lower: 900000, upper: 950000 };
}

export function getWallHitsTarget(room: Room) {
    return getWallBuildModeBoundaries(room).upper;
}

export function getConsumptionMode(room: Room) {
    return room.storage && util.getRoomMemory(room.name).consumptionMode;
}

export function getWallBuildMode(room: Room) {
    return util.getRoomMemory(room.name).wallBuildMode;
}

export function switchModes(room: Room) {
    switchConsumptionMode(room);
    switchWallBuildMode(room);
}

function switchConsumptionMode(room: Room) {
    if (!room.storage) return;
    const consumptionMode = util.getRoomMemory(room.name).consumptionMode;
    const bounds = getConsumptionModeBoundaries(room);
    if (!consumptionMode && room.storage.store.getUsedCapacity() > bounds.upper) {
        util.modifyRoomMemory(room.name, o => o.consumptionMode = true);
    }
    else if (consumptionMode && room.storage.store.getUsedCapacity() < bounds.lower) {
        util.modifyRoomMemory(room.name, o => o.consumptionMode = false);
    }
}

function switchWallBuildMode(room: Room) {
    if (Game.time % 15 !== 0) return;
    const wallBuildMode = util.getRoomMemory(room.name).wallBuildMode;
    const bounds = getWallBuildModeBoundaries(room);
    const walls = util.findWallsAndRamparts(room);
    if (wallBuildMode && util.all(walls, o => o.hits > bounds.upper)) {
        util.modifyRoomMemory(room.name, o => o.wallBuildMode = false);
    }
    else if (!wallBuildMode && util.any(walls, o => o.hits < bounds.lower)) {
        util.modifyRoomMemory(room.name, o => o.wallBuildMode = true);
    }
}