import * as util from './util';
import * as rooms from './rooms';
import * as map from './map';
import * as spawnMetrics from './spawn.metrics';
import * as bodies from './spawn.bodies';

const creepLifetime = 1500;
const battleTime = 500;

export function createWave(targetRoomName: string) {
    if (!Memory.raidWaves) {
        Memory.raidWaves = [];
    }
    const meetupFlagName = rooms.getRaidWaveMeetupFlagName(targetRoomName);
    if (!meetupFlagName || !Game.flags[meetupFlagName]) {
        console.warn('Can\'t spawn raid wave without a meetup flag (target room ' + targetRoomName + ')');
        return 0;
    }
    const meetupFlag = rooms.getRaidWaveMeetupFlag(targetRoomName);
    const targetFlag = rooms.getFlag(targetRoomName);
    const distance = map.measurePathDistance(meetupFlag.pos, targetFlag.pos);
    const travelTime = distance / bodies.getRavagerMoveSpeed();
    const wave: RaidWave = {
        id: Game.time,
        targetRoomName: targetRoomName,
        deadline: Game.time + (creepLifetime - travelTime - battleTime),
        creeps: []
    };
    Memory.raidWaves.push(wave);
    return wave.id;
}

export function getWaveSize(roomName: string) {
    var waveSize = 0;
    const meetupFlag = rooms.getRaidWaveMeetupFlag(roomName);
    const targetFlag = rooms.getFlag(roomName);
    const distanceBetweenFlags = map.measurePathDistance(meetupFlag.pos, targetFlag.pos);
    const spawns = util.findSpawns(roomName, 3);
    for (let i = 0; i < spawns.length; i++) {
        const spawn = spawns[i];
        const distance = distanceBetweenFlags + spawnMetrics.getPathDistanceToFlag(spawn, meetupFlag);
        waveSize += getWaveSizeForSpawn(spawn, distance);
    }
    return Math.floor(waveSize);
}

function getWaveSizeForSpawn(spawn: StructureSpawn, distance: number) {
    if (!getIsSpawnReady(spawn)) return 0;
    return Math.min(getMaxPotencyGivenEnergyConstraints(spawn), getMaxPotencyGivenTimeConstraints(distance));
}

function getIsSpawnReady(spawn: StructureSpawn) {
    return spawn.memory.queue.length < 2;
}

function getMaxPotencyGivenEnergyConstraints(spawn: StructureSpawn) {
    const room = spawn.room;
    if (!room.storage) return 0;
    const spawnsInRoom = room.find(FIND_MY_SPAWNS);
    const energyDevotedToQueues = util.sum(spawnsInRoom, o => {
        return util.sum(o.memory.queue, q => q.energyCost);
    });
    console.log('energy devoted to queues: ' + energyDevotedToQueues);
    const buffer = 3000;
    const totalEnergyAvailable = Math.max(0, room.storage.store[RESOURCE_ENERGY] - energyDevotedToQueues - buffer);
    const energyAvailableToSpawn = totalEnergyAvailable / spawnsInRoom.length;
    console.log('energy available to spawn: ' + energyAvailableToSpawn);
    console.log('max potency given energy constraints: ' + energyAvailableToSpawn / bodies.getRavagerSpawnEnergyPerPotency());
    return energyAvailableToSpawn / bodies.getRavagerSpawnEnergyPerPotency();
}

function getMaxPotencyGivenTimeConstraints(distance: number) {
    const travelTime = distance / bodies.getRavagerMoveSpeed();
    console.log('travel time: ' + travelTime);
    const timeLeftForSpawning = Math.max(0, creepLifetime - travelTime - battleTime);
    console.log('max potency given time constraints: ' + timeLeftForSpawning / bodies.getRavagerSpawnTimePerPotency());
    return timeLeftForSpawning / bodies.getRavagerSpawnTimePerPotency();
}

