"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const cache = require("./cache");
const sourceManager = require("./manager.sources");
function getIdeals(roomName, doClaim, wartime) {
    const key = '5621016b-1eae-4322-950d-e51a2043a0d5.' + roomName + '.' + doClaim + '.' + wartime;
    return cache.get(key, 93, () => getIdealsInternal(roomName, doClaim, wartime));
}
exports.getIdeals = getIdeals;
function getIdealsInternal(roomName, doClaim, wartime) {
    const room = Game.rooms[roomName];
    if (!room)
        return null;
    const hubFlag = util.findHubFlag(room);
    var activeSources = room.find(FIND_SOURCES, { filter: (o) => util.isSourceActive(o) });
    const towers = room.find(FIND_MY_STRUCTURES, { filter: o => util.isTower(o) });
    const extensions = room.find(FIND_MY_STRUCTURES, { filter: o => util.isExtension(o) && o.isActive });
    const links = room.find(FIND_MY_STRUCTURES, { filter: o => util.isLink(o) });
    const extractors = room.find(FIND_MY_STRUCTURES, { filter: o => o.structureType === STRUCTURE_EXTRACTOR });
    const nonRoadConstructionSites = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: o => o.structureType !== STRUCTURE_ROAD });
    const containers = room.find(FIND_STRUCTURES, { filter: o => util.isContainer(o) });
    const storageUnits = room.find(FIND_MY_STRUCTURES, { filter: o => util.isStorage(o) });
    const totalTransportDistanceForSources = _.sum(activeSources.map(o => sourceManager.getSourceMetrics(o).transportDistance || 10));
    const idealHarvesterPotencyPerSource = 7;
    const idealHarvesterPotencyPerMineral = 18;
    var idealTransporterPotency = Math.max(0, Math.ceil(Math.pow(totalTransportDistanceForSources, .7) * 1.9) - 4)
        + Math.ceil(room.energyCapacityAvailable / 1000);
    // HACK because this room has a lot of remote mining operations and has to spawn a lot
    if (roomName === 'E44N32') {
        idealTransporterPotency += 6;
    }
    if (totalTransportDistanceForSources > 0 && idealTransporterPotency <= 0) {
        idealTransporterPotency = 2;
    }
    var idealUpgraderPotency = Math.max(3, Math.ceil(3.5 * activeSources.length));
    var idealWallBuilderPotency = Math.max(2, Math.ceil(3.5 * activeSources.length));
    if (doClaim) {
        idealTransporterPotency += 6;
        if (wartime) {
            idealTransporterPotency += 6;
        }
        if (!towers.length) {
            idealTransporterPotency -= 2;
            idealUpgraderPotency += 2;
            idealWallBuilderPotency += 2;
        }
        if (!extractors.length) {
            idealTransporterPotency += 1;
            idealUpgraderPotency += 2;
        }
        if (links.length < 3) {
            idealTransporterPotency += 3;
        }
        if (!containers.length) {
            idealUpgraderPotency -= 5;
            idealWallBuilderPotency -= 5;
        }
        if (!storageUnits.length) {
            idealUpgraderPotency += 2;
            idealWallBuilderPotency += 2;
            idealTransporterPotency -= 3;
        }
        if (storageUnits.length && hubFlag) {
            idealTransporterPotency -= 4;
        }
        if (nonRoadConstructionSites.length) {
            idealUpgraderPotency += 1;
            idealWallBuilderPotency += 1;
        }
        if (!containers.length && !storageUnits.length) {
            idealTransporterPotency = 0;
        }
        if (extensions.length < 5) {
            idealUpgraderPotency = Math.floor(idealUpgraderPotency * 3 / 4);
            idealWallBuilderPotency = 0;
        }
    }
    else {
        idealUpgraderPotency += idealWallBuilderPotency;
        idealWallBuilderPotency = 0;
    }
    if (room && room.storage) {
        var consumptionMode = util.getRoomMemory(roomName).consumptionMode;
        if (!consumptionMode && _.sum(room.storage.store) > 950000) {
            consumptionMode = true;
        }
        else if (consumptionMode && _.sum(room.storage.store) < 900000) {
            consumptionMode = false;
        }
        if (consumptionMode) {
            idealTransporterPotency += 5;
            idealUpgraderPotency += 14;
        }
        util.modifyRoomMemory(roomName, o => o.consumptionMode = consumptionMode);
    }
    if (!doClaim && room && !room.find(FIND_MY_CONSTRUCTION_SITES).length) {
        idealUpgraderPotency = Math.ceil(room.find(FIND_STRUCTURES).length / 12);
        idealWallBuilderPotency = 0;
    }
    return {
        upgraderPotency: idealUpgraderPotency,
        wallBuilderPotency: idealWallBuilderPotency,
        transporterPotency: idealTransporterPotency,
        harvesterPotencyPerSource: idealHarvesterPotencyPerSource,
        harvesterPotencyPerMineral: idealHarvesterPotencyPerMineral
    };
}
//# sourceMappingURL=manager.spawn.ideals.js.map