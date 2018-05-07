import * as I from './interfaces';
import * as util from './util';
import * as potency from './util.potency';
import * as idealsManager from './manager.spawn.ideals';
import * as spawnQueue from './manager.spawn.queue';

interface SpawnOrder {
    spawn: Spawn;
    order: I.RoomOrder;
}

export function getRoomOrder(roomName: string) {

    const cachedOrder = util.getRoomMemory(roomName).order;
    if (cachedOrder) return cachedOrder;

    const room = Game.rooms[roomName];
    if (!room) return null;

    const hubFlag = util.findHubFlag(room);

    const ideals = idealsManager.getIdeals(roomName);

    var activeSources = room.find<Source>(FIND_SOURCES, { filter: (o: Source) => util.isSourceActive(o) });

    const transporterPotency = potency.getPotency(roomName, 'transporter');
    const transporterPotencyNeeded = ideals.transporterPotency - transporterPotency;

    const wallBuilderPotency = potency.getPotency(roomName, 'builder', 'wallBuilder');
    const wallBuilderPotencyNeeded = ideals.wallBuilderPotency - wallBuilderPotency;

    const upgraderPotency = potency.getPotency(roomName, 'builder', 'upgrader');
    const upgraderPotencyNeeded = ideals.upgraderPotency - upgraderPotency;

    var hubPotencyNeeded = 0;
    if (hubFlag && room.storage && potency.getPotency(roomName, 'hub') === 0) {
        hubPotencyNeeded = Math.floor(.65 * Math.sqrt(room.energyCapacityAvailable / 50));
    }

    const order: I.RoomOrder = {
        roomName: roomName,
        transporterPotency: transporterPotencyNeeded,
        wallBuilderPotency: wallBuilderPotencyNeeded,
        upgraderPotency: upgraderPotencyNeeded,
        hubPotency: hubPotencyNeeded
    }

    util.modifyRoomMemory(roomName, o => o.order = order);
    return order;
}

export function getSourceOrder(roomName: string, sourceOrMineralId: string) {

    const sourceOrders = util.getRoomMemory(roomName).sourceOrders || {};
    const cachedOrder = sourceOrders[sourceOrMineralId];
    if (cachedOrder) return cachedOrder;

    const sourceOrMineral = Game.getObjectById<Source | Mineral>(sourceOrMineralId);
    if (!sourceOrMineral || !sourceOrMineral.room) return null;

    const ideals = idealsManager.getIdeals(roomName);

    const harvesterPotency = potency.getPotency(roomName, 'harvester', undefined, sourceOrMineralId);

    const idealPotency = util.isSource(sourceOrMineral)
        ? ideals.harvesterPotencyPerSource
        : ideals.harvesterPotencyPerMineral;

    const order: I.SourceOrder = {
        sourceOrMineralId: sourceOrMineralId,
        harvesterPotency: idealPotency - harvesterPotency
    };

    sourceOrders[sourceOrMineralId] = order;
    util.modifyRoomMemory(roomName, o => o.sourceOrders = sourceOrders);
    return order;
}

export function fulfillRoomOrder(order: I.RoomOrder) {
    if (!order.upgraderPotency &&
        !order.wallBuilderPotency &&
        !order.transporterPotency &&
        !order.hubPotency) {
        // the order is empty, so there's nothing to do
        return;
    }
    // look at spawns within 2 linear room distance
    const spawns: Spawn[] = _.filter(Game.spawns, (o: Spawn) =>
        Game.map.getRoomLinearDistance(o.room.name, order.roomName) <= 2);
    // split order into sub-orders for each creep that needs to be spawned
    const spawnOrders = assignOrderToSpawns(order, spawns);
    for (let i in spawnOrders) {
        const spawnOrder = spawnOrders[i];
        spawnQueue.addRoomOrderToQueue(spawnOrder.spawn, spawnOrder.order);
    }
}

function assignOrderToSpawns(order: I.RoomOrder, spawns: Spawn[]): SpawnOrder[] {
    // TODO if we are spawning a hub, make sure to assign it to a spawn that is adjacent to the hub flag
    const bestSpawn = util.getBestValue(spawns.map(getSpawnValue));
}

function getSpawnValue(spawn: Spawn): util.ValueData<Spawn> {

}