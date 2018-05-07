import * as I from './interfaces';
import * as util from './util';
import * as rooms from './rooms';
import * as bodies from './manager.spawn.bodies';

export function addRoomOrderToQueue(spawn: Spawn, order: I.RoomOrder) {
    var role: string = null;
    var subRole: string = null;
    var bodyResult: bodies.BodyResult = null;
    // we are expecting this order to only have one type of worker, because it corresponds to a single creep
    if (order.upgraderPotency) {
        role = 'builder';
        subRole = 'upgrader';
        bodyResult = bodies.generateBuilderBody(order.upgraderPotency, spawn.room, order.roomName, subRole);
    }
    if (order.wallBuilderPotency) {
        role = 'builder';
        subRole = 'wallBuilder';
        bodyResult = bodies.generateBuilderBody(order.wallBuilderPotency, spawn.room, order.roomName, subRole);
    }
    if (order.transporterPotency) {
        role = 'transporter';
        bodyResult = bodies.generateTransporterBody(order.transporterPotency, spawn.room, order.roomName);
    }
    if (order.hubPotency) {
        role = 'hub';
        bodyResult = bodies.generateHubBody(order.hubPotency, spawn.room, order.roomName);
    }
    addItemToQueue(spawn, {
        role: role,
        subRole: role,
        assignmentId: null,
        assignedRoomName: order.roomName,
        homeRoomName: determineHomeRoom(role, order.roomName),
        doClaim: rooms.getDoClaim(order.roomName),
        potency: bodyResult.potency,
        energyCost: bodies.getEnergyCost(bodyResult.body),
        timeCost: bodies.getTimeCost(bodyResult.body)
    });
}

function addItemToQueue(spawn: Spawn, item: I.SpawnQueueItem) {
    const queue = util.getSpawnMemory(spawn).queue || [];
    queue.push(item);
    util.modifySpawnMemory(spawn, o => o.queue = queue);
    util.refreshOrders(item.assignedRoomName);
}

function determineHomeRoom(role: string, assignedRoomName: string): string {

}