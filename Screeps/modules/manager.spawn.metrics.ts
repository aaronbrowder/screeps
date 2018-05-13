import * as util from './util';
import * as map from './map';
import * as rooms from './rooms';

export function getPathDistance(spawn: Spawn, roomName: string) {

    util.modifySpawnMemory(spawn, o => o.distances = o.distances || {});
    var spawnDistance = util.getSpawnMemory(spawn).distances[roomName];

    if (!spawnDistance || Game.time - spawnDistance.timestamp > 10000) {
        const flag = rooms.getFlag(roomName);
        if (!flag) {
            console.log('WARNING: cant get spawn distance for room ' + roomName + ' because there is no flag there');
            return null;
        }
        spawnDistance = {
            timestamp: Game.time,
            distance: map.measurePathDistance(spawn.pos, flag.pos)
        }
        util.modifySpawnMemory(spawn, o => o.distances[roomName] = spawnDistance);
    }

    return spawnDistance.distance;
}

export function getHealth(spawn: Spawn) {
    // health = 1 if there is never any downtime where there are items in the queue but it's not spawning
    // because of a lack of energy. the more downtime there is, the closer to 0 health will be.
    // we should use trend data to calculate this.
    // TODO implement
    return 1;
}