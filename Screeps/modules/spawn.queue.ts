import * as util from './util';
import * as rooms from './rooms';
import * as cache from './cache';
import * as bodies from './spawn.bodies';
import * as spawnMetrics from './spawn.metrics';
import * as sources from './manager.sources';

export function addItemToQueue(spawn: StructureSpawn, assignedRoomName: string, role: string,
    subRole: string, assignmentId: string, bodyResult: bodies.BodyResult, raidWaveId: number) {

    const item: SpawnQueueItem = {
        spawnId: spawn.id,
        role: role,
        subRole: subRole,
        assignmentId: assignmentId,
        assignedRoomName: assignedRoomName,
        homeRoomName: determineHomeRoom(role, assignedRoomName),
        doClaim: rooms.getDirective(assignedRoomName) === rooms.DIRECTIVE_CLAIM,
        potency: bodyResult.potency,
        energyCost: bodies.getEnergyCost(bodyResult.body),
        timeCost: bodies.getTimeCost(bodyResult.body),
        raidWaveId: raidWaveId
    };
    const queue = getQueue(spawn);
    queue.push(item);
    if (queue.length > 10) {
        const warning = 'Spawn queue for spawn ' + spawn.name + ' contains ' + queue.length + ' items.';
        console.log(warning);
        Game.notify(warning);
    }
    util.modifySpawnMemory(spawn, o => o.queue = queue);
}

export function removeItemFromQueue(item: SpawnQueueItem) {
    const spawn = Game.getObjectById<StructureSpawn>(item.spawnId);
    const queue = getQueue(spawn);
    const i = queue.findIndex(o =>
        o.spawnId === item.spawnId &&
        o.role === item.role &&
        o.subRole === item.subRole &&
        o.assignmentId === item.assignmentId &&
        o.assignedRoomName === item.assignedRoomName &&
        o.homeRoomName === item.homeRoomName &&
        o.doClaim === item.doClaim &&
        o.potency === item.potency &&
        o.raidWaveId === item.raidWaveId
    );
    if (i === -1) return false;
    queue.splice(i, 1);
    util.modifySpawnMemory(spawn, o => o.queue = queue);
    return true;
}

export function removeItemsFromAllQueues(func: (o: SpawnQueueItem) => boolean) {
    for (let i in Game.spawns) {
        const spawn = Game.spawns[i];
        const queue = getQueue(spawn);
        while (true) {
            const result = queue.findIndex(func);
            if (result === -1) break;
            queue.splice(result, 1);
        }
        util.modifySpawnMemory(spawn, o => o.queue = queue);
    }
}

export function countItemsInAllQueues(func: (o: SpawnQueueItem) => boolean): number {
    var count = 0;
    for (let i in Game.spawns) {
        const spawn = Game.spawns[i];
        const queue = getQueue(spawn);
        count += util.count(queue, func);
    }
    return count;
}

function determineHomeRoom(role: string, assignedRoomName: string): string {
    if (role === 'harvester' || role === 'builder') return assignedRoomName;
    const maxDistance = getMaxDistance();
    const key = '33436f72-91aa-403c-bbd2-29c2328988b5.' + assignedRoomName + '.' + maxDistance;
    return cache.get(key, 3000, () => {
        const spawns = util.findSpawns(assignedRoomName, maxDistance);
        // filter the spawns so we have no more than one spawn from each room
        const filteredSpawns: StructureSpawn[] = [];
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
                value: -getPathDistance(o)
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

    function getPathDistance(spawn: StructureSpawn) {
        const room = Game.rooms[assignedRoomName];
        if (room && role === 'transporter') {
            // use source metrics for transporters, because that takes into account links, etc.
            const source = room.find(FIND_SOURCES)[0];
            if (source) {
                const sourceMetrics = sources.getSourceMetrics(source);
                const repository = Game.getObjectById<Structure>(sourceMetrics.repositoryId);
                if (repository && repository.room.name === spawn.room.name) {
                    return sourceMetrics.transportDistance;
                }
            }
        }
        return spawnMetrics.getPathDistance(spawn, assignedRoomName);
    }
}

export function getTimeLoad(spawn: StructureSpawn): number {
    const queue = getQueue(spawn);
    return (spawn.spawning ? spawn.spawning.remainingTime : 0) + _.sum(queue, (o: SpawnQueueItem) => o.timeCost);
}

export function getEnergyLoad(spawn: StructureSpawn): number {
    const queue = getQueue(spawn);
    return _.sum(queue, (o: SpawnQueueItem) => o.energyCost);
}

function getQueue(spawn: StructureSpawn) {
    return util.getSpawnMemory(spawn).queue || [];
}