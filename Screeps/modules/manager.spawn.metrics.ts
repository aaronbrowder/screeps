import * as util from './util';
import * as map from './map';
import * as rooms from './rooms';

export function getPathDistance(spawn: Spawn, roomName: string) {

    var spawnDistance = (util.getSpawnMemory(spawn).distances || {})[roomName];

    if (!spawnDistance || Game.time - spawnDistance.timestamp > 10000) {
        const flag = rooms.getFlag(roomName);
        if (!flag) {
            console.log('cant get spawn distance for room ' + roomName + ' because there is no flag there');
            return null;
        }
        spawnDistance = {
            timestamp: Game.time,
            distance: map.measurePathDistance(spawn.pos, flag.pos)
        }
        util.modifySpawnMemory(spawn, o => o.distances[roomName] = spawnDistance);
    }

    return spawnDistance;
}