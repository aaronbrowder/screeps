import * as util from './util';
import * as rooms from './rooms';
import * as sourceManager from './manager.sources';
import * as battleManager from './manager.battle';
import * as spawnOrders from './spawn.orders';
import * as bodies from './spawn.bodies';
import * as raid from './spawn.raid';
import * as spawnQueue from './spawn.queue';

export function run() {

    const roomsToProcess = getRoomsToProcess(rooms.getActiveControlDirectives());

    for (let i in roomsToProcess) {
        processOrders(roomsToProcess[i]);
    }

    for (let i in Game.spawns) {
        const spawn = Game.spawns[i];
        spawnFromQueue(spawn);
    }
}

function getRoomsToProcess(directives: rooms.ControlDirective[]): string[] {
    const rooms = directives.map(o => {
        const room = Game.rooms[o.roomName];
        return {
            roomName: o.roomName,
            room: room
        };
    });
    // Sort rooms so that the higher level rooms come first. This is because high level rooms
    // will be in high demand for spawning, but we want rooms to prioritize spawning for themselves
    // so that we don't get into a situation where two neighbors are spawning for each other.
    const sortedRooms = _.sortBy(rooms, (o: { roomName: string, room: Room }) => {
        if (!o.room || !o.room.controller || !o.room.controller.my) return 0;
        return -o.room.controller.level;
    });
    return sortedRooms.map(o => o.roomName);
}

function processOrders(roomName: string) {

    var needsRefresh = Game.time % 133 === 0;

    const roomOrder = spawnOrders.getRoomOrder(roomName);
    var didFulfillOrder = spawnOrders.fulfillRoomOrder(roomOrder);
    if (didFulfillOrder) {
        needsRefresh = true;
    }

    const room = Game.rooms[roomName];
    if (room) {
        const activeSources = room.find(FIND_SOURCES, { filter: (o: Source) => util.isSourceActive(o) }) as Array<Source | Mineral>;
        const activeMinerals = room.find(FIND_MINERALS, { filter: (o: Mineral) => util.isMineralActive(o) }) as Array<Source | Mineral>;
        const activeSourcesAndMinerals = activeSources.concat(activeMinerals);

        for (let i in activeSourcesAndMinerals) {
            const sourceOrder = spawnOrders.getSourceOrder(roomName, activeSourcesAndMinerals[i].id);
            didFulfillOrder = spawnOrders.fulfillSourceOrder(sourceOrder);
            if (didFulfillOrder) needsRefresh = true;
        }
    }

    if (needsRefresh) {
        util.refreshOrders(roomName);
    }
}

function spawnFromQueue(spawn: StructureSpawn) {
    if (spawn.spawning) return;
    const item = getItemFromQueue(spawn);
    if (!item) return;
    // we should never try to spawn workers if we don't have eyes in the room. this will cause an error.
    if (util.isWorkerRole(item.role) && !Game.rooms[item.assignedRoomName]) {
        console.log('WARNING: trying to spawn ' + item.role + ' in room with no eyes (' + item.assignedRoomName + ') from spawn ' + spawn.name);
        return;
    }
    const creepName = item.role + Game.time;
    const body = generateBody(spawn, item);
    const options = {
        directions: getSpawnDirections(spawn, item),
        memory: {
            role: item.role,
            assignmentId: item.assignmentId,
            subRole: item.subRole,
            homeRoomName: item.homeRoomName,
            assignedRoomName: item.assignedRoomName,
            doClaim: item.doClaim,
            raidWaveId: item.raidWaveId
        }
    } as any;
    if (item.role === 'harvester' && !item.assignmentId) {
        throw 'trying to spawn a harvester with no assignmentId';
    }
    const result = spawn.spawnCreep(body, creepName, options);
    if (result === OK) {
        spawnQueue.removeItemFromQueue(item);
        if (item.raidWaveId) {
            battleManager.assignCreepsToWaves();
        }
    }
}

function getItemFromQueue(spawn: StructureSpawn): SpawnQueueItem {
    const queue = util.getSpawnMemory(spawn).queue;
    if (!queue) return null;
    const eligibleItems = util.filter(queue, o => o.energyCost <= spawn.room.energyCapacityAvailable);
    if (!eligibleItems.length) return null;
    const sorted = util.sortBy(eligibleItems, o => {
        const room = Game.rooms[o.assignedRoomName];
        if (o.role === 'hub') return 0;
        if (o.role === 'scout') return 1;
        if (o.role === 'ravager') return 2;
        if (o.role === 'transporter' && room && room.storage && room.storage.store[RESOURCE_ENERGY] > 2000) return 3;
        if (o.role === 'harvester') return 4;
        if (o.role === 'builder') return 5;
        if (o.role === 'transporter') return 6;
        return 100;
    });
    return sorted[0];
}

function getSpawnDirections(spawn: StructureSpawn, item: SpawnQueueItem) {
    // spawn hubs towards the hub flag.
    // spawn other things away from the hub flag.
    var directions: number[] = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];
    const hubFlag = util.findHubFlag(spawn.room);
    if (!hubFlag || !hubFlag.pos.inRangeTo(spawn, 1)) return directions;
    const hubFlagDirection = spawn.pos.getDirectionTo(hubFlag);
    if (item.role === 'hub') {
        return [hubFlagDirection];
    }
    const removeIndex = directions.indexOf(hubFlagDirection);
    if (removeIndex > -1) {
        directions.splice(removeIndex, 1);
    }
    return directions;
}

function generateBody(spawn: StructureSpawn, item: SpawnQueueItem) {
    const result = bodies.generateBody(item.potency, spawn.room, item.assignedRoomName, item.role, item.subRole, item.assignmentId);
    return result ? result.body : null;
}
