import * as I from './interfaces';
import * as util from './util';
import * as rooms from './rooms';
import * as cache from './cache';
import * as bodies from './manager.spawn.bodies';
import * as metrics from './manager.spawn.metrics';

export function addItemToQueue(spawn: Spawn, assignedRoomName: string,
    role: string, subRole: string, assignmentId: string, bodyResult: bodies.BodyResult) {

    const item = {
        spawnId: spawn.id,
        role: role,
        subRole: role,
        assignmentId: assignmentId,
        assignedRoomName: assignedRoomName,
        homeRoomName: determineHomeRoom(role, assignedRoomName),
        doClaim: rooms.getDoClaim(assignedRoomName),
        potency: bodyResult.potency,
        energyCost: bodies.getEnergyCost(bodyResult.body),
        timeCost: bodies.getTimeCost(bodyResult.body)
    };
    const queue = getQueue(spawn);
    queue.push(item);
    util.modifySpawnMemory(spawn, o => o.queue = queue);
}

export function removeItemFromQueue(item: I.SpawnQueueItem) {
    const spawn = Game.getObjectById<Spawn>(item.spawnId);
    const queue = getQueue(spawn);
    const i = queue.findIndex(o =>
        o.spawnId === item.spawnId &&
        o.role === item.role &&
        o.subRole === item.subRole &&
        o.assignmentId === item.assignmentId &&
        o.assignedRoomName === item.assignedRoomName &&
        o.homeRoomName === item.homeRoomName &&
        o.doClaim === item.doClaim &&
        o.potency === item.potency
    );
    if (i === -1) return false;
    queue.splice(i, 1);
    util.modifySpawnMemory(spawn, o => o.queue = queue);
    return true;
}

function determineHomeRoom(role: string, assignedRoomName: string): string {
    if (role === 'harvester' || role === 'builder') return assignedRoomName;
    const maxDistance = getMaxDistance();
    const key = '33436f72-91aa-403c-bbd2-29c2328988b5.' + assignedRoomName + '.' + maxDistance;
    return cache.get(key, 3000, () => {
        const spawns = util.findSpawns(assignedRoomName, maxDistance);
        // filter the spawns so we have no more than one spawn from each room
        const filteredSpawns: Spawn[] = [];
        const roomNames: string[] = [];
        for (let i in spawns) {
            const spawn = spawns[i];
            if (roomNames.indexOf(spawn.room.name) === -1) {
                roomNames.push(spawn.room.name);
                filteredSpawns.push(spawn);
            }
        }
        // pick the spawn that is closest to the assigned room by path
        const valueData = filteredSpawns.map(o => {
            return {
                target: o.room.name,
                value: -metrics.getPathDistance(o, assignedRoomName)
            };
        });
        return util.getBestValue(valueData);
    });
    function getMaxDistance() {
        switch (role) {
            // transporters will not be efficient if they have to travel long distances
            case 'transporter': return 2;
            default: return 4;
        }
    }
}

export function getTimeLoad(spawn: Spawn): number {
    const queue = getQueue(spawn);
    return (spawn.spawning ? spawn.spawning.remainingTime : 0) + _.sum(queue, (o: I.SpawnQueueItem) => o.timeCost);
}

export function getEnergyLoad(spawn: Spawn): number {
    const queue = getQueue(spawn);
    return _.sum(queue, (o: I.SpawnQueueItem) => o.energyCost);
}

function getQueue(spawn: Spawn) {
    return util.getSpawnMemory(spawn).queue || [];
}