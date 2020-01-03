import * as util from './util';
import * as enums from './enums';
import * as rooms from './rooms';
import * as sourceManager from './manager.sources';
import * as battleManager from './manager.battle';
import * as spawnOrders from './spawn.orders';
import * as bodies from './spawn.bodies';
import * as raid from './spawn.raid';
import * as spawnQueue from './spawn.queue';

export function run() {

    cleanQueues();

    const roomsToProcess = getRoomsToProcess(rooms.getActiveControlDirectives());
    for (let i in roomsToProcess) {
        processOrders(roomsToProcess[i]);
    }

    for (let i in Game.spawns) {
        const spawn = Game.spawns[i];
        spawnFromQueue(spawn);
    }
}

function cleanQueues() {
    // every once in a while, wipe the queues and re-calculate them
    if (Game.time % 133 === 0) {
        for (let i in Game.spawns) {
            const spawn = Game.spawns[i];
            util.modifySpawnMemory(spawn, o => o.queue = []);
        }
    }
    // check to see if there are any unnecessary defenders in queues
    for (let i in Game.spawns) {
        const spawn = Game.spawns[i];
        // check if the threat level was nonzero in the previous tick but is zero now
        if (spawn.memory.threatLevel > 0 && util.getThreatLevel(spawn.room) === 0) {
            spawnQueue.removeItemsFromQueues(o => o.subRole === enums.DEFENDER, [spawn]);
        }
        util.modifySpawnMemory(spawn, o => o.threatLevel = util.getThreatLevel(spawn.room));
    }
}

function getRoomsToProcess(directives: ControlDirective[]): string[] {
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

    const room = Game.rooms[roomName];

    var needsRefresh = Game.time % 111 === 0 || (room && util.getThreatLevel(room) > 0);

    const roomOrder = spawnOrders.getRoomOrder(roomName);
    var didFulfillOrder = spawnOrders.fulfillRoomOrder(roomOrder);
    if (didFulfillOrder) {
        needsRefresh = true;
    }

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
    if (item.role === enums.HARVESTER && !item.assignmentId) {
        throw 'trying to spawn a harvester with no assignmentId';
    }
    const result = spawn.spawnCreep(body, creepName, options);
    if (result === OK) {
        if (item.raidWaveId) {
            battleManager.assignCreepsToWaves();
        }
        spawnQueue.removeItemFromQueue(item);
    }
}

function getItemFromQueue(spawn: StructureSpawn): SpawnQueueItem {
    const queue = util.getSpawnMemory(spawn).queue;
    if (!queue) return null;
    // make sure we have the ability to add energy to extensions
    const canTransport = !!spawn.room.storage && spawn.room.find(FIND_MY_CREEPS, {
        filter: o => o.memory.role === enums.TRANSPORTER && o.memory.assignedRoomName === spawn.room.name
    }).length > 0;
    // filter and sort items
    const eligibleItems = util.filter(queue, o => isItemEligible(o));
    if (!eligibleItems.length) return null;
    const sorted = util.sortBy(eligibleItems, o => {
        const assignedRoom = Game.rooms[o.assignedRoomName];
        const energyStored = assignedRoom ? util.sum(util.findStores(assignedRoom), o => o.store[RESOURCE_ENERGY]) : 0;
        var order = getSortOrder(o.role, energyStored);
        // prioritize creeps being spawned for the spawn room
        if (o.assignedRoomName !== spawn.room.name) order += 100;
        return order;
    });
    return sorted[0];

    function isItemEligible(item: SpawnQueueItem) {
        // don't spawn a defender if there are already 3 or more defenders in the room
        if (item.subRole === enums.DEFENDER) {
            const existingDefenders = spawn.room.find(FIND_MY_CREEPS, { filter: o => o.memory.subRole === enums.DEFENDER });
            if (existingDefenders.length >= 3) return false;
        }
        // don't spawn certain types of creeps if there are hostile creeps in the room
        const isVulnerableRole = util.any([enums.HARVESTER, enums.BUILDER, enums.CLAIMER, enums.SCOUT], o => o === item.role);
        const isRemoteTransporter = item.role === enums.TRANSPORTER && item.assignedRoomName !== spawn.room.name;
        if (isVulnerableRole || isRemoteTransporter) {
            const hostileCreeps = spawn.room.find(FIND_HOSTILE_CREEPS);
            if (hostileCreeps.length) return false;
        }
        // if we don't have the ability to transport energy to extensions, don't try to spawn something we can't afford
        if (!canTransport) {
            return item.energyCost <= spawn.room.energyAvailable;
        }
        // otherwise, an item is considered eligible if we have enough energy capacity in the room to eventually spawn it
        return item.energyCost <= spawn.room.energyCapacityAvailable;
    }

    function getSortOrder(role: RoleConstant, energyStored: number) {
        if (role === enums.HUB) return 0;
        if (role === enums.SCOUT) return 1;
        if (role === enums.TRANSPORTER && energyStored > 1000) return 2;
        if (role === enums.COMBATANT) return 3;
        if (role === enums.HARVESTER) return 4;
        if (role === enums.BUILDER) return 5;
        if (role === enums.TRANSPORTER) return 6;
        return 100;
    }
}

function getSpawnDirections(spawn: StructureSpawn, item: SpawnQueueItem) {
    // spawn hubs towards the hub flag.
    // spawn other things away from the hub flag.
    var directions: number[] = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];
    const hubFlag = util.findHubFlag(spawn.room);
    if (!hubFlag || !hubFlag.pos.inRangeTo(spawn, 1)) return directions;
    const hubFlagDirection = spawn.pos.getDirectionTo(hubFlag);
    if (item.role === enums.HUB) {
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
    return result && result.potency > 0 ? result.body : null;
}
