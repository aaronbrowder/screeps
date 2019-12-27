import * as util from './util';
import * as map from './map';
import * as rooms from './rooms';

export function getPathDistance(spawn: StructureSpawn, roomName: string) {
    const flag = rooms.getFlag(roomName);
    if (!flag) {
        console.log('WARNING: cant get spawn distance for room ' + roomName + ' because there is no flag there');
        return null;
    }
    return getPathDistanceToFlag(spawn, flag);
}

export function getPathDistanceToFlag(spawn: StructureSpawn, flag: Flag) {
    util.modifySpawnMemory(spawn, o => o.distances = o.distances || {});
    var spawnDistance = util.getSpawnMemory(spawn).distances[flag.name];

    if (!spawnDistance || Game.time - spawnDistance.timestamp > 10000) {

        spawnDistance = {
            timestamp: Game.time,
            distance: map.measurePathDistance(spawn.pos, flag.pos)
        }
        util.modifySpawnMemory(spawn, o => o.distances[flag.name] = spawnDistance);
    }

    return spawnDistance.distance;
}

export function getHealth(spawn: StructureSpawn) {
    // health = 1 if there is never any downtime where there are items in the queue but it's not spawning
    // because of a lack of energy. the more downtime there is, the closer to 0 health will be.
    // we should use trend data to calculate this.
    // TODO implement
    return 1;
}