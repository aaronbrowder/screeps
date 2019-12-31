import * as util from './util';
import * as modes from './util.modes';
import * as cache from './cache';
import * as rooms from './rooms';
import * as enums from './enums';
import * as sourceManager from './manager.sources';

export interface Ideals {
    builderPotency: number;
    transporterPotency: number;
    claimerPotencyForReservation: number;
    defenderPotency: number;
    harvesterPotencyPerSource: number;
    harvesterPotencyPerMineral: number;
}

function defaultIdeals(): Ideals {
    return {
        builderPotency: 0,
        transporterPotency: 0,
        claimerPotencyForReservation: 2,
        defenderPotency: 0,
        harvesterPotencyPerSource: 0,
        harvesterPotencyPerMineral: 0
    }
}

export function getIdeals(roomName: string) {
    const room = Game.rooms[roomName];
    const threatLevel = room ? util.getThreatLevel(room) : 0;
    const directive = rooms.getDirective(roomName);
    const key = '5621016b-1eae-4322-950d-e51a2043a0d5.' + roomName + '.' + directive + '.' + threatLevel;
    return cache.get(key, 93, () => getIdealsInternal(roomName, directive, threatLevel));
}

function getIdealsInternal(roomName: string, directive: DirectiveConstant, threatLevel: number): Ideals {

    if (directive !== enums.DIRECTIVE_CLAIM &&
        directive !== enums.DIRECTIVE_HARVEST &&
        directive !== enums.DIRECTIVE_RESERVE_AND_HARVEST) {
        return defaultIdeals();
    }

    const room = Game.rooms[roomName];
    if (!room) return defaultIdeals();

    const isThreatBig = threatLevel > Math.pow(room.controller.level, 2);

    const hubFlag = util.findHubFlag(room);

    const activeSources = room.find(FIND_SOURCES, { filter: (o: Source) => util.isSourceActive(o) });
    const towers = room.find<StructureTower>(FIND_MY_STRUCTURES, { filter: o => util.isTower(o) });
    const extensions = room.find<StructureExtension>(FIND_MY_STRUCTURES, { filter: o => util.isExtension(o) && o.isActive });
    const links = room.find<StructureLink>(FIND_MY_STRUCTURES, { filter: o => util.isLink(o) });
    const extractors = room.find<StructureExtractor>(FIND_MY_STRUCTURES, { filter: o => o.structureType === STRUCTURE_EXTRACTOR });
    const roadConstructionSites = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: o => o.structureType === STRUCTURE_ROAD });
    const nonRoadConstructionSites = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: o => o.structureType !== STRUCTURE_ROAD });
    const nonWallStructures = room.find(FIND_STRUCTURES, { filter: o => !util.isWall(o) });
    const containers = room.find<StructureContainer>(FIND_STRUCTURES, { filter: o => util.isContainer(o) });
    const storageUnits = room.find<StructureStorage>(FIND_MY_STRUCTURES, { filter: o => util.isStorage(o) });

    const ideals = defaultIdeals();

    ideals.builderPotency = getIdealBuilderPotency();
    ideals.transporterPotency = getIdealTransporterPotency();
    ideals.defenderPotency = getIdealDefenderPotency();
    ideals.harvesterPotencyPerSource = getIdealHarvesterPotencyPerSource();
    ideals.harvesterPotencyPerMineral = getIdealHarvesterPotencyPerMineral();

    return ideals;

    function getIdealBuilderPotency() {
        if (room.controller.my) {
            const level = room.controller.level;
            var result = 4;
            // if level is not high enough to build storage, consumption mode is not possible, so we 
            // need to make sure we have enough builders to upgrade and build walls.
            if (level === 2) {
                result = 10;
            }
            if (level === 3) {
                result = 16;
            }
            // before getting the first spawn up, we'll need a lot of help from other rooms
            if (!room.find(FIND_MY_SPAWNS).length) {
                result = 16;
            }
            // make sure we have enough builders to build our structures
            if (level >= 3 && nonRoadConstructionSites.length) {
                result = 16;
            }
            // if in consumption mode, we go all out: enough to make the energy in storage go back down
            if (modes.getConsumptionMode(room)) {
                result = 32;
            }
            return result;
        }
        if (directive === enums.DIRECTIVE_HARVEST || directive === enums.DIRECTIVE_RESERVE_AND_HARVEST) {
            return Math.ceil(nonWallStructures.length / 10) +
                (2 * nonRoadConstructionSites.length) +
                Math.ceil(roadConstructionSites.length / 5);
        }
    }

    function getIdealTransporterPotency() {

        const totalTransportDistanceForSources: number = _.sum(activeSources.map(o =>
            sourceManager.getSourceMetrics(o).transportDistance || 10));

        var result =
            Math.max(0, Math.ceil(Math.pow(totalTransportDistanceForSources, .7) * 1.9) - 4)
            + Math.ceil(room.energyCapacityAvailable / 1000);

        if (totalTransportDistanceForSources > 0 && result <= 0) {
            result = 2;
        }
        // sources have half as much energy capacity if the room is unowned and unreserved
        if (!room.controller.my && !room.controller.reservation) {
            result = Math.ceil(result / 2);
        }
        if (directive === enums.DIRECTIVE_CLAIM) {
            result += 6;
            if (isThreatBig) {
                result += 6;
            }
            if (!towers.length) {
                result -= 2;
            }
            if (!extractors.length) {
                result += 1;
            }
            if (links.length < 3) {
                result += 3;
            }
            if (!storageUnits.length && containers.length < 2) {
                result = 0;
            }
            if (!storageUnits.length) {
                result -= 3;
            }
            if (storageUnits.length && hubFlag) {
                result -= 4;
            }
            if (!containers.length && !storageUnits.length) {
                result = 0;
            }
        }
        return result;
    }

    function getIdealHarvesterPotencyPerSource() {
        var result = 7;
        // sources have half as much energy capacity if the room is unowned and unreserved
        if (!room.controller.my && !room.controller.reservation) {
            result = Math.ceil(result / 2);
        }
        return result;
    }

    function getIdealHarvesterPotencyPerMineral() {
        var result = 18;
        // HACK - stop harvesting if we already have more than 500,000 minerals stored in the room
        if (room.storage && _.sum(room.storage.store) - room.storage.store[RESOURCE_ENERGY] > 500000) {
            result = 0;
        }
        return result;
    }

    function getIdealDefenderPotency() {
        var result = 0
        if (directive === enums.DIRECTIVE_CLAIM) {
            // here 1 simply indicates that we want to spawn defenders.
            // we will keep spawning defenders until the threat is gone.
            return isThreatBig ? 1 : 0;
        }
        return result;
    }
}