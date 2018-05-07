import * as I from './interfaces';
import * as util from './util';
import * as rooms from './rooms';
import * as spawnSiege from './manager.spawn.siege';
import * as sourceManager from './manager.sources';
import * as spawnOrders from './manager.spawn.orders';
import * as bodies from './manager.spawn.bodies';

export function run() {

    const controlDirectives: rooms.ControlDirective[] = _.filter(rooms.getControlDirectives(),
        (o: rooms.ControlDirective) => o.doClaim || o.doReserve);

    const username = _.find(Game.structures).owner.username;

    for (let i in controlDirectives) {
        const d = controlDirectives[i];
        processOrders(d.roomName, d.doClaim);
    }

    if (Memory['siegeMode']) {
        spawnSiege.run();
    }

    for (let i in Game.spawns) {
        const spawn = Game.spawns[i];
        spawnFromQueue(spawn);
    }
}

function processOrders(roomName: string, doClaim: boolean) {

    var room = Game.rooms[roomName];

    if (!room || !room.find(FIND_MY_SPAWNS).length) {
        // there are no spawns in this room. if we want to set up a colony in this room, we'll need colonists.
        if (doClaim) {
            runColonistSpawn();
            return;
        } else {
            // we only want to reserve the room, not claim it.
            // we don't return here, so the rest of runRoomSpawn will execute as normal.
            spawnClaimers();
            // do return if we don't have eyes in the room. the claimer will give us eyes.
            if (!room) return;
        }
    }

    const roomOrder = spawnOrders.getRoomOrder(roomName);
    spawnOrders.fulfillRoomOrder(roomOrder);

    const activeSources = room.find<Source | Mineral>(FIND_SOURCES, { filter: (o: Source) => util.isSourceActive(o) });
    const activeMinerals = room.find<Source | Mineral>(FIND_MINERALS, { filter: (o: Mineral) => util.isMineralActive(o) });
    const activeSourcesAndMinerals = activeSources.concat(activeMinerals);

    for (let i in activeSourcesAndMinerals) {
        const sourceOrder = spawnOrders.getSourceOrder(roomName, activeSourcesAndMinerals[i].id);
        spawnOrders.fulfillSourceOrder(sourceOrder);
    }
}

function spawnFromQueue(spawn: Spawn) {
    if (spawn.spawning) return;
    const queue = util.getSpawnMemory(spawn).queue;
    if (!queue || !queue.length) return;
    const item = queue[0];
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
            doClaim: item.doClaim
        }
    };
    const result = spawn.spawnCreep(body, creepName, options);
    if (result === OK) {
        // remove the item from the queue
        queue.shift();
        util.modifySpawnMemory(spawn, o => o.queue = queue);
        // record the expense
        updateRemoteMiningMetrics(item.assignedRoomName, item.homeRoomName, item.role, body);
    }
}

function getSpawnDirections(spawn: Spawn, item: I.SpawnQueueItem) {
    // spawn hubs towards the hub flag.
    // spawn other things away from the hub flag.
    const hubFlag = util.findHubFlag(spawn.room);
    if (!hubFlag || !hubFlag.pos.inRangeTo(spawn, 1)) return null;
    const hubFlagDirection = spawn.pos.getDirectionTo(hubFlag);
    if (item.role === 'hub') {
        return [hubFlagDirection];
    }
    var directions: number[] = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];
    const removeIndex = directions.indexOf(hubFlagDirection);
    if (removeIndex > -1) {
        directions.splice(removeIndex, 1);
    }
    return directions;
}

function generateBody(spawn: Spawn, item: I.SpawnQueueItem) {
    if (item.role === 'builder') {
        return bodies.generateBuilderBody(item.potency, spawn.room, item.assignedRoomName, item.subRole).body;
    } else if (item.role === 'harvester') {
        return bodies.generateHarvesterBody(item.potency, spawn.room, item.assignedRoomName, item.assignmentId).body;
    } else if (item.role === 'transporter') {
        return bodies.generateTransporterBody(item.potency, spawn.room, item.assignedRoomName).body;
    } else if (item.role === 'hub') {
        return bodies.generateBuilderBody(item.potency, spawn.room, item.assignedRoomName, item.subRole).body;
    }
    // TODO generate other kinds of bodies
}

function updateRemoteMiningMetrics(roomName: string, homeRoomName: string, role: string, body: string[]) {
    if (roomName !== homeRoomName && role === 'transporter' || role === 'builder' || role === 'harvester') {
        const remoteMiningMetrics = Memory.remoteMiningMetrics || {};
        const roomMetrics = remoteMiningMetrics[roomName] || { cost: 0, income: 0 };
        const cost = (util.countBodyParts(body, 'WORK') * 100)
            + (util.countBodyParts(body, 'MOVE') * 50)
            + (util.countBodyParts(body, 'CARRY') * 50)
            + (util.countBodyParts(body, 'CLAIM') * 600);
        roomMetrics.cost += cost;
        remoteMiningMetrics[roomName] = roomMetrics;
        Memory.remoteMiningMetrics = remoteMiningMetrics;
    }
}

function spawnForWartime() {
}

function spawnForPeacetime() {
}

function runColonistSpawn() {
}

function spawnClaimers() {
}