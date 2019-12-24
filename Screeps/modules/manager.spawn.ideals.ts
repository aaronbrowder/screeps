import * as util from './util';
import * as cache from './cache';
import * as rooms from './rooms';
import * as sourceManager from './manager.sources';

export interface Ideals {
    upgraderPotency: number;
    wallBuilderPotency: number;
    transporterPotency: number;
    claimerPotencyForReservation: number;
    ravagerPotency: number;
    harvesterPotencyPerSource: number;
    harvesterPotencyPerMineral: number;
}

export function getIdeals(roomName: string) {
    const room = Game.rooms[roomName];
    const threatLevel = room ? util.getThreatLevel(room) : 0;
    const doClaim = rooms.getDoClaim(roomName);
    const key = '5621016b-1eae-4322-950d-e51a2043a0d5.' + roomName + '.' + doClaim + '.' + threatLevel;
    return cache.get(key, 93, () => getIdealsInternal(roomName, doClaim, threatLevel));
}

function getIdealsInternal(roomName: string, doClaim: boolean, threatLevel: number): Ideals {

    const room = Game.rooms[roomName];
    if (!room) return null;

    const hubFlag = util.findHubFlag(room);

    var activeSources = room.find(FIND_SOURCES, { filter: (o: Source) => util.isSourceActive(o) });

    const towers = room.find<StructureTower>(FIND_MY_STRUCTURES, { filter: o => util.isTower(o) });
    const extensions = room.find<StructureExtension>(FIND_MY_STRUCTURES, { filter: o => util.isExtension(o) && o.isActive });
    const links = room.find<StructureLink>(FIND_MY_STRUCTURES, { filter: o => util.isLink(o) });
    const extractors = room.find<StructureExtractor>(FIND_MY_STRUCTURES, { filter: o => o.structureType === STRUCTURE_EXTRACTOR });
    const nonRoadConstructionSites = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: o => o.structureType !== STRUCTURE_ROAD });
    const containers = room.find<StructureContainer>(FIND_STRUCTURES, { filter: o => util.isContainer(o) });
    const storageUnits = room.find<StructureStorage>(FIND_MY_STRUCTURES, { filter: o => util.isStorage(o) });

    const totalTransportDistanceForSources: number = _.sum(activeSources.map(o =>
        sourceManager.getSourceMetrics(o).transportDistance || 10));

    const idealHarvesterPotencyPerSource = 7;
    var idealHarvesterPotencyPerMineral = 18;

    // HACK - stop harvesting if we already have more than 500,000 minerals stored in the room
    if (room.storage && _.sum(room.storage.store) - room.storage.store[RESOURCE_ENERGY] > 500000) {
        idealHarvesterPotencyPerMineral = 0;
    }

    var idealTransporterPotency =
        Math.max(0, Math.ceil(Math.pow(totalTransportDistanceForSources, .7) * 1.9) - 4)
        + Math.ceil(room.energyCapacityAvailable / 1000);

    if (totalTransportDistanceForSources > 0 && idealTransporterPotency <= 0) {
        idealTransporterPotency = 2;
    }

    var idealUpgraderPotency = Math.max(3, Math.ceil(3.5 * activeSources.length));
    var idealWallBuilderPotency = Math.max(2, Math.ceil(3.5 * activeSources.length));

    if (doClaim) {
        idealTransporterPotency += 6;
        if (threatLevel > 20) {
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
            idealUpgraderPotency = 6;
            idealWallBuilderPotency = 0;
        }
    } else {
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

    var ravagerPotency = 0;
    if (!doClaim) {
        // ravager potency is measured by the number of ATTACK parts, but ravagers also have some
        // RANGED_ATTACK and TOUGH parts. we should take this into account when examining the threat level.
        ravagerPotency = Math.ceil(threatLevel / 2);
    }

    var claimerPotencyForReservation = 3;

    return {
        upgraderPotency: idealUpgraderPotency,
        wallBuilderPotency: idealWallBuilderPotency,
        transporterPotency: idealTransporterPotency,
        claimerPotencyForReservation: claimerPotencyForReservation,
        ravagerPotency: ravagerPotency,
        harvesterPotencyPerSource: idealHarvesterPotencyPerSource,
        harvesterPotencyPerMineral: idealHarvesterPotencyPerMineral
    }
}