import * as I from './interfaces';
import * as util from './util';
import * as potency from './util.potency';
import * as rooms from './rooms';
import * as idealsManager from './manager.spawn.ideals';
import * as spawnQueue from './manager.spawn.queue';
import * as bodies from './manager.spawn.bodies';
import * as spawnMetrics from './manager.spawn.metrics';

export function getRoomOrder(roomName: string) {

    const cachedOrder = util.getRoomMemory(roomName).order;
    if (cachedOrder) return cachedOrder;

    var transporterPotencyNeeded = 0;
    var wallBuilderPotencyNeeded = 0;
    var upgraderPotencyNeeded = 0;
    var hubPotencyNeeded = 0;
    var claimerPotencyNeeded = 0;
    var scoutPotencyNeeded = 0;
    var ravagerPotencyNeeded = 0;

    const room = Game.rooms[roomName];

    if (!room) {
        const scoutPotency = potency.getPotency(roomName, 'scout');
        if (!scoutPotency) {
            scoutPotencyNeeded = 1;
        }
    }
    else {
        const ideals = idealsManager.getIdeals(roomName);
        const doClaim = rooms.getDoClaim(roomName);

        if (room.controller && !room.controller.my) {
            // we don't own this room, so we'll need a claimer
            const claimerPotency = potency.getPotency(roomName, 'claimer');
            if (doClaim) {
                // we want to claim the room, not reserve it
                if (claimerPotency === 0) {
                    claimerPotencyNeeded = 1;
                }
            } else {
                // we want to reserve the room
                if (room.controller.reservation &&
                    room.controller.reservation.username === _.find(Game.structures).owner.username &&
                    room.controller.reservation.ticksToEnd > 3500) {
                    // the controller has been reserved for nearly the maximum amount of time.
                    // it's pointless to spawn a claimer right now.
                } else {
                    claimerPotencyNeeded = ideals.claimerPotencyForReservation - claimerPotency;
                    if (claimerPotencyNeeded < 0) claimerPotencyNeeded = 0;
                    if (claimerPotency > 0 && util.countSurroundingWalls(room.controller.pos) === 7) {
                        // if there's only one spot next to the controller, it's pointless to spawn a second claimer
                        claimerPotencyNeeded = 0;
                    }
                }
            }
        }

        const transporterPotency = potency.getPotency(roomName, 'transporter');
        transporterPotencyNeeded = ideals.transporterPotency - transporterPotency;

        const wallBuilderPotency = potency.getPotency(roomName, 'builder', 'wallBuilder');
        wallBuilderPotencyNeeded = ideals.wallBuilderPotency - wallBuilderPotency;

        const upgraderPotency = potency.getPotency(roomName, 'builder', 'upgrader');
        upgraderPotencyNeeded = ideals.upgraderPotency - upgraderPotency;

        const ravagerPotency = potency.getPotency(roomName, 'ravager');
        ravagerPotencyNeeded = ideals.ravagerPotency - ravagerPotency;

        const hubFlag = util.findHubFlag(room);
        if (hubFlag && room.storage && potency.getPotency(roomName, 'hub') === 0) {
            hubPotencyNeeded = Math.floor(.65 * Math.sqrt(room.energyCapacityAvailable / 50));
        }

        // we can never create an order with negative potency.
        // but we can recycle some creep, or remove one from the queue.
        if (transporterPotencyNeeded < 0) {
            deleteCreep(roomName, 'transporter');
            transporterPotencyNeeded = 0;
        }
        if (wallBuilderPotencyNeeded < 0) {
            deleteCreep(roomName, 'builder', 'wallBuilder');
            wallBuilderPotencyNeeded = 0;
        }
        if (upgraderPotencyNeeded < 0) {
            deleteCreep(roomName, 'builder', 'upgrader');
            upgraderPotencyNeeded = 0;
        }
        if (ravagerPotencyNeeded < 0) {
            deleteCreep(roomName, 'ravager');
            ravagerPotencyNeeded = 0;
        }
    }

    const order: I.RoomOrder = {
        roomName: roomName,
        transporterPotency: transporterPotencyNeeded,
        wallBuilderPotency: wallBuilderPotencyNeeded,
        upgraderPotency: upgraderPotencyNeeded,
        hubPotency: hubPotencyNeeded,
        claimerPotency: claimerPotencyNeeded,
        scoutPotency: scoutPotencyNeeded,
        ravagerPotency: ravagerPotencyNeeded
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
        roomName: roomName,
        sourceOrMineralId: sourceOrMineralId,
        harvesterPotency: idealPotency - harvesterPotency
    };

    if (order.harvesterPotency < 0) {
        deleteCreep(roomName, 'harvester', undefined, sourceOrMineralId);
        order.harvesterPotency = 0;
    }

    sourceOrders[sourceOrMineralId] = order;
    util.modifyRoomMemory(roomName, o => o.sourceOrders = sourceOrders);
    return order;
}

function deleteCreep(roomName: string, role: string, subRole?: string, assignmentId?: string) {
    // We can only delete one creep here. We want to choose the smallest creep, whether that creep is active or in a
    // spawn queue. If there is a tie for smallest, we want to remove a creep from the queue before killing an active one.
    const creepsInQueue = util.sortBy(potency.getCreepsInQueue(roomName, role, subRole, assignmentId), o => o.potency);
    const activeCreeps = util.sortBy(potency.getActiveCreeps(roomName, role, subRole, assignmentId), o => potency.getCreepPotency(o));

    const potencyOfSmallestCreepInQueue = creepsInQueue.length ? creepsInQueue[0].potency : -1;
    const potencyOfSmallestActiveCreep = activeCreeps.length ? potency.getCreepPotency(activeCreeps[0]) : -1;

    if (creepsInQueue.length && potencyOfSmallestCreepInQueue <= potencyOfSmallestActiveCreep) {
        spawnQueue.removeItemFromQueue(creepsInQueue[0]);
    }
    else if (activeCreeps.length) {
        util.recycle(activeCreeps[0]);
    }
}

export function fulfillRoomOrder(order: I.RoomOrder) {
    if (!order.upgraderPotency &&
        !order.wallBuilderPotency &&
        !order.transporterPotency &&
        !order.hubPotency &&
        !order.claimerPotency &&
        !order.scoutPotency &&
        !order.ravagerPotency) {
        // the order is empty, so there's nothing to do
        return false;
    }
    const spawns: Spawn[] = util.findSpawns(order.roomName, 2);
    // if there are no nearby spawns, we can't fulfill the order
    if (!spawns.length) return false;
    assignRoomOrderToSpawns(spawns, order);
    return true;
}

export function fulfillSourceOrder(order: I.SourceOrder) {
    if (!order.harvesterPotency) return false;
    const spawns: Spawn[] = util.findSpawns(order.roomName, 2);
    if (!spawns.length) return false;
    assignSourceOrderToSpawns(spawns, order);
    return true;
}

function assignRoomOrderToSpawns(spawns: Spawn[], order: I.RoomOrder) {
    if (order.scoutPotency) {
        assignOrderPartToSpawns(spawns, order.scoutPotency, order.roomName, 'scout');
    }
    if (order.ravagerPotency) {
        assignOrderPartToSpawns(spawns, order.ravagerPotency, order.roomName, 'ravager');
    }
    // we should never try to spawn workers if we don't have eyes in the room. this will cause an error.
    if (Game.rooms[order.roomName]) {
        if (order.upgraderPotency) {
            assignOrderPartToSpawns(spawns, order.upgraderPotency, order.roomName, 'builder', 'upgrader');
        }
        if (order.wallBuilderPotency) {
            assignOrderPartToSpawns(spawns, order.wallBuilderPotency, order.roomName, 'builder', 'wallBuilder');
        }
        if (order.transporterPotency) {
            assignOrderPartToSpawns(spawns, order.transporterPotency, order.roomName, 'transporter');
        }
        if (order.claimerPotency) {
            assignOrderPartToSpawns(spawns, order.claimerPotency, order.roomName, 'claimer');
        }
        if (order.hubPotency) {
            // if we are spawning a hub, make sure to assign it to a spawn that is adjacent to the hub flag
            const hubFlag = util.findHubFlag(Game.rooms[order.roomName]);
            if (hubFlag) {
                const hubSpawns = _.filter(spawns, (o: Spawn) => o.pos.inRangeTo(hubFlag, 1));
                if (hubSpawns.length) {
                    const bodyResult = bodies.generateBody(order.hubPotency, hubSpawns[0].room, order.roomName, 'hub');
                    spawnQueue.addItemToQueue(hubSpawns[0], order.roomName, 'hub', null, null, bodyResult);
                }
            }
        }
    }
}

function assignSourceOrderToSpawns(spawns: Spawn[], order: I.SourceOrder) {
    assignOrderPartToSpawns(spawns, order.harvesterPotency, order.roomName, 'harvester', null, order.sourceOrMineralId);
}

function assignOrderPartToSpawns(spawns: Spawn[], potency: number,
    roomName: string, role: string, subRole?: string, assignmentId?: string) {

    const spawn = util.getBestValue(spawns.map(o => {
        const bodyResult = bodies.generateBody(potency, o.room, roomName, role, subRole, assignmentId);
        return getSpawnValue(o, roomName, potency, bodyResult);
    }));

    const bodyResult = bodies.generateBody(potency, spawn.room, roomName, role, subRole, assignmentId);
    spawnQueue.addItemToQueue(spawn, roomName, role, subRole, assignmentId, bodyResult);

    const remainingPotency = potency - bodyResult.potency;
    if (remainingPotency > 0) {
        assignOrderPartToSpawns(spawns, remainingPotency, roomName, role, subRole, assignmentId);
    }
}

function getSpawnValue(spawn: Spawn, roomName: string, desiredPotency: number, bodyResult: bodies.BodyResult): util.ValueData<Spawn> {
    // The distance the spawned creep will need to travel to get to its assignment should be our primary consideration.
    // We want the distance to be as low as possible.
    const pathDistance = spawnMetrics.getPathDistance(spawn, roomName);
    // Ideally we will only need one creep, but that depends on the spawn room's energy capacity being enough to cover
    // the body of a large creep. If the energy capacity is low, we may need to spawn two or more creeps in order to
    // fulfill the desired potency. A spawn that can fulfill the desired potency with a single creep is preferable
    // to a spawn that requires multiple creeps. This is because the more creeps we have, the greater the CPU load
    // and the greater the traffic congestion.
    const numberOfCreepsNeeded = Math.ceil(desiredPotency / bodyResult.potency);
    // The time load on the spawn is the amount of time it will take before it has finished spawning all its existing
    // obligations. We want to choose a spawn with a low time load so we can get our creep sooner.
    const timeLoad = spawnQueue.getTimeLoad(spawn);
    // The health of the spawn is an estimate of its ability to acquire enough energy to spawn stuff. Ideally it
    // will be able to fulfill the items in its queue immediately without any downtime while waiting for enengy.
    // A value of 1 is ideal, and less than that is less than ideal.
    const health = spawnMetrics.getHealth(spawn);

    const distanceValue = -pathDistance / bodies.getUnladenSpeedOnRoads(bodyResult.body);
    const creepsValue = -75 * (numberOfCreepsNeeded - 1);
    const timeLoadValue = -Math.min(timeLoad, 5000);
    const healthValue = 200 * health;
    const value = distanceValue + creepsValue + timeLoadValue + healthValue;
    return { target: spawn, value: value };
}