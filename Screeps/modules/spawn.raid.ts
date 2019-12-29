import * as util from './util';
import * as rooms from './rooms';
import * as map from './map';
import * as spawnMetrics from './spawn.metrics';
import * as bodies from './spawn.bodies';
import { RaidDirective } from './rooms';

const creepLifetime = 1500;
const battleTime = 250;

export function createWave(targetRoomName: string) {
    if (!Memory.raidWaves) {
        Memory.raidWaves = [];
    }
    const meetupFlag = rooms.getRaidWaveMeetupFlag(targetRoomName);
    const targetFlag = rooms.getFlag(targetRoomName);
    const raidDirective = rooms.getRaidDirective(targetRoomName);
    const distance = map.measurePathDistance(meetupFlag.pos, targetFlag.pos);
    const travelTime = distance / bodies.getMoveSpeed(raidDirective.raiderBodyType);
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
    const targetFlag = rooms.getFlag(roomName);
    const meetupFlag = rooms.getRaidWaveMeetupFlag(roomName);
    const raidDirective = rooms.getRaidDirective(roomName);
    const distanceBetweenFlags = map.measurePathDistance(meetupFlag.pos, targetFlag.pos);
    const spawns = util.findSpawns(roomName, 3);
    for (let i = 0; i < spawns.length; i++) {
        const spawn = spawns[i];
        const distance = distanceBetweenFlags + spawnMetrics.getPathDistanceToFlag(spawn, meetupFlag);
        waveSize += getWaveSizeForSpawn(spawn, distance, raidDirective);
    }
    const wavesForRoom = util.filter(Memory.raidWaves, o => o.targetRoomName === roomName);
    const existingRaidPotency = util.sum(wavesForRoom, o => util.sum(o.creeps.map(id => Game.getObjectById(id)), c => bodies.measurePotency(c)));
    const maxSize = Math.max(0, (rooms.getRaidDirective(roomName).maxPotency || 100000) - existingRaidPotency);
    return Math.min(Math.floor(waveSize), maxSize);
}

function getWaveSizeForSpawn(spawn: StructureSpawn, distance: number, directive: RaidDirective) {
    if (!getIsSpawnReady(spawn)) return 0;
    return Math.min(
        getMaxPotencyGivenEnergyConstraints(spawn, directive),
        getMaxPotencyGivenTimeConstraints(distance, directive));
}

function getIsSpawnReady(spawn: StructureSpawn) {
    return spawn.memory.queue.length < 2;
}

function getMaxPotencyGivenEnergyConstraints(spawn: StructureSpawn, directive: RaidDirective) {
    const room = spawn.room;
    if (!room.storage) return 0;
    const spawnsInRoom = room.find(FIND_MY_SPAWNS);
    const energyDevotedToQueues = util.sum(spawnsInRoom, o => {
        return util.sum(o.memory.queue, q => q.energyCost);
    });
    const buffer = 3000;
    const totalEnergyAvailable = Math.max(0, room.storage.store[RESOURCE_ENERGY] - energyDevotedToQueues - buffer);
    const energyAvailableToSpawn = totalEnergyAvailable / spawnsInRoom.length;
    const result = energyAvailableToSpawn / bodies.getUnitCost(directive.raiderBodyType);
    console.log('max potency given energy constraints: ' + result);
    return result;
}

function getMaxPotencyGivenTimeConstraints(distance: number, directive: RaidDirective) {
    const travelTime = distance / bodies.getMoveSpeed(directive.raiderBodyType);
    console.log('travel time: ' + travelTime);
    const timeLeftForSpawning = Math.max(0, creepLifetime - travelTime - battleTime);
    const result = timeLeftForSpawning / bodies.getUnitSpawnTime(directive.raiderBodyType);
    console.log('max potency given time constraints: ' + result);
    return result;
}

