import * as util from './util';
import * as idealsManager from './manager.spawn.ideals';

export interface SpawnQueueItem {
    role: string;
    subRole: string;
    assignmentId: string;
    assignedRoomName: string;
    homeRoomName: string;
    doClaim: boolean;
    potency: number;
    energyCost: number;
    timeCost: number;
}

export interface RoomOrder {
    roomName: string;
    wallBuilderPotency: number;
    upgraderPotency: number;
    transporterPotency: number;
    hubPotency: number;
}

export interface SourceOrder {
    sourceOrMineralId: string;
    harvesterPotency: number;
}

export function getRoomOrder(roomName: string, doClaim: boolean, wartime: boolean): RoomOrder {

    const room = Game.rooms[roomName];
    if (!room) return null;

    const hubFlag = util.findHubFlag(room);

    const ideals = idealsManager.getIdeals(roomName, doClaim, wartime);

    var activeSources = room.find<Source>(FIND_SOURCES, { filter: (o: Source) => util.isSourceActive(o) });

    const transporterPotency = getPotency(roomName, 'transporter');
    const transporterPotencyNeeded = ideals.transporterPotency - transporterPotency;

    const wallBuilderPotency = getPotency(roomName, 'builder', 'wallBuilder');
    const wallBuilderPotencyNeeded = ideals.wallBuilderPotency - wallBuilderPotency;

    const upgraderPotency = getPotency(roomName, 'builder', 'upgrader');
    const upgraderPotencyNeeded = ideals.upgraderPotency - upgraderPotency;

    var hubPotencyNeeded = 0;
    if (hubFlag && room.storage && getPotency(roomName, 'hub') === 0) {
        hubPotencyNeeded = Math.floor(.65 * Math.sqrt(room.energyCapacityAvailable / 50));
    }

    return {
        roomName: roomName,
        transporterPotency: transporterPotencyNeeded,
        wallBuilderPotency: wallBuilderPotencyNeeded,
        upgraderPotency: upgraderPotencyNeeded,
        hubPotency: hubPotencyNeeded
    }
}

export function getSourceOrder(sourceOrMineralId: string, doClaim: boolean, wartime: boolean): SourceOrder {

    const sourceOrMineral = Game.getObjectById<Source | Mineral>(sourceOrMineralId);
    if (!sourceOrMineral || !sourceOrMineral.room) return null;

    const roomName = sourceOrMineral.room.name;
    const ideals = idealsManager.getIdeals(roomName, doClaim, wartime);

    const potency = getPotency(roomName, 'harvester', undefined, sourceOrMineralId);

    const idealPotency = util.isSource(sourceOrMineral)
        ? ideals.harvesterPotencyPerSource
        : ideals.harvesterPotencyPerMineral;

    return {
        sourceOrMineralId: sourceOrMineralId,
        harvesterPotency: idealPotency - potency
    };
}

function getPotency(roomName: string, role: string, subRole?: string, assignmentId?: string) {
    // "Potency" is a measure of how much of a type of worker there is in a room. For example, for transporters,
    // potency measures the current capacity of that room to transport things, by counting the total number of
    // carry parts of all transporters working in the room.
    // * A creep with less than 100 ticks to live does not count towards the potency.
    // * A creep that is currently spawning or is in a spawn queue DOES count towards the potency.
    const creeps: Creep[] = _.filter(Game.creeps, (o: Creep) =>
        o.ticksToLive >= 100 &&
        o.memory.role === role &&
        o.memory.assignedRoomName === roomName &&
        (!subRole || o.memory.subRole === subRole) &&
        (!assignmentId || o.memory.assignmentId === assignmentId));

    var potency = _.sum(creeps, (o: Creep) => getCreepPotency(o.body.map(p => p.type), role));

    for (let i in Game.spawns) {
        const spawn = Game.spawns[i];
        const queue: SpawnQueueItem[] = spawn.memory.queue;
        const filtered = _.filter(queue, (o: SpawnQueueItem) =>
            o.role === role &&
            o.assignedRoomName === roomName &&
            (!subRole || o.subRole === subRole) &&
            (!assignmentId || o.assignmentId === assignmentId));
        potency += _.sum(filtered, (o: SpawnQueueItem) => o.potency);
    }

    return potency;
}

function getCreepPotency(body: string[], role: string) {
    if (role === 'builder') return util.countBodyParts(body, WORK);
    if (role === 'harvester') return util.countBodyParts(body, WORK);
    if (role === 'transporter') return util.countBodyParts(body, CARRY);
    if (role === 'hub') return util.countBodyParts(body, CARRY);
}