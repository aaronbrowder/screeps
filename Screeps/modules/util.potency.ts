import * as I from './interfaces';
import * as util from './util';

// "Potency" is a measure of how much of a type of worker there is in a room. For example, for transporters,
// potency measures the current capacity of that room to transport things, by counting the total number of
// carry parts of all transporters working in the room.
// * A creep that is elderly or marked for recycle does not count towards the potency.
// * A creep that is currently spawning or is in a spawn queue DOES count towards the potency.

export function getPotency(roomName: string, role: string, subRole?: string, assignmentId?: string) {
    const activeCreeps = getActiveCreeps(roomName, role, subRole, assignmentId);
    const potencyFromLivingCreeps = util.sum(activeCreeps, getCreepPotency);
    const potencyFromSpawnQueue = getPotencyInQueue(roomName, role, subRole, assignmentId);
    return potencyFromLivingCreeps + potencyFromSpawnQueue;
}

export function getActiveCreeps(roomName: string, role: string, subRole?: string, assignmentId?: string): Creep[] {
    return _.filter(Game.creeps, (o: Creep) =>
        !o.memory.isElderly &&
        !o.memory.markedForRecycle &&
        o.memory.role === role &&
        o.memory.assignedRoomName === roomName &&
        (!subRole || o.memory.subRole === subRole) &&
        (!assignmentId || o.memory.assignmentId === assignmentId));
}

export function getCreepPotency(creep: Creep) {
    const body = creep.body.map(p => p.type);
    const role: string = creep.memory.role;
    if (role === 'builder') return util.countBodyParts(body, WORK);
    if (role === 'harvester') return util.countBodyParts(body, WORK);
    if (role === 'transporter') return util.countBodyParts(body, CARRY);
    if (role === 'hub') return util.countBodyParts(body, CARRY);
    if (role === 'claimer') return util.countBodyParts(body, CLAIM);
    if (role === 'scout') return 1;
    if (role === 'ravager') return util.countBodyParts(body, ATTACK);
}

function getPotencyInQueue(roomName: string, role: string, subRole?: string, assignmentId?: string): number {
    const creeps = getCreepsInQueue(roomName, role, subRole, assignmentId);
    return _.sum(creeps, (o: I.SpawnQueueItem) => o.potency);
}

export function getCreepsInQueue(roomName: string, role: string, subRole?: string, assignmentId?: string) {
    var result: I.SpawnQueueItem[] = [];
    for (let i in Game.spawns) {
        const spawn = Game.spawns[i];
        const queue = util.getSpawnMemory(spawn).queue || [];
        const filtered: I.SpawnQueueItem[] = _.filter(queue, (o: I.SpawnQueueItem) =>
            o.role === role &&
            o.assignedRoomName === roomName &&
            (!subRole || o.subRole === subRole) &&
            (!assignmentId || o.assignmentId === assignmentId));
        result = result.concat(filtered);
    }
    return result;
}