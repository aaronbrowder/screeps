"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const idealsManager = require("./manager.spawn.ideals");
const spawnQueue = require("./manager.spawn.queue");
function getRoomOrder(roomName, doClaim, wartime) {
    const cachedOrder = util.getRoomMemory(roomName).order;
    if (cachedOrder)
        return cachedOrder;
    const room = Game.rooms[roomName];
    if (!room)
        return null;
    const hubFlag = util.findHubFlag(room);
    const ideals = idealsManager.getIdeals(roomName, doClaim, wartime);
    var activeSources = room.find(FIND_SOURCES, { filter: (o) => util.isSourceActive(o) });
    const transporterPotency = getPotency(roomName, 'transporter');
    const transporterPotencyNeeded = ideals.transporterPotency - transporterPotency;
    const wallBuilderPotency = getPotency(roomName, 'builder', 'wallBuilder');
    const wallBuilderPotencyNeeded = ideals.wallBuilderPotency - wallBuilderPotency;
    const upgraderPotency = getPotency(roomName, 'builder', 'upgrader');
    const upgraderPotencyNeeded = ideals.upgraderPotency - upgraderPotency;
    var hubPotencyNeeded = 0;
    if (hubFlag && room.storage && getPotency(roomName, 'hub') === 0) {
        hubPotencyNeeded = Math.floor(.65 * Math.sqrt(room.energyCapacityAvailable / 50));
    }
    const order = {
        roomName: roomName,
        transporterPotency: transporterPotencyNeeded,
        wallBuilderPotency: wallBuilderPotencyNeeded,
        upgraderPotency: upgraderPotencyNeeded,
        hubPotency: hubPotencyNeeded
    };
    util.modifyRoomMemory(roomName, o => o.order = order);
    return order;
}
exports.getRoomOrder = getRoomOrder;
function getSourceOrder(roomName, sourceOrMineralId, doClaim, wartime) {
    const sourceOrders = util.getRoomMemory(roomName).sourceOrders || {};
    const cachedOrder = sourceOrders[sourceOrMineralId];
    if (cachedOrder)
        return cachedOrder;
    const sourceOrMineral = Game.getObjectById(sourceOrMineralId);
    if (!sourceOrMineral || !sourceOrMineral.room)
        return null;
    const ideals = idealsManager.getIdeals(roomName, doClaim, wartime);
    const potency = getPotency(roomName, 'harvester', undefined, sourceOrMineralId);
    const idealPotency = util.isSource(sourceOrMineral)
        ? ideals.harvesterPotencyPerSource
        : ideals.harvesterPotencyPerMineral;
    const order = {
        sourceOrMineralId: sourceOrMineralId,
        harvesterPotency: idealPotency - potency
    };
    sourceOrders[sourceOrMineralId] = order;
    util.modifyRoomMemory(roomName, o => o.sourceOrders = sourceOrders);
    return order;
}
exports.getSourceOrder = getSourceOrder;
function getPotency(roomName, role, subRole, assignmentId) {
    // "Potency" is a measure of how much of a type of worker there is in a room. For example, for transporters,
    // potency measures the current capacity of that room to transport things, by counting the total number of
    // carry parts of all transporters working in the room.
    // * A creep that is near death by aging does not count towards the potency.
    // * A creep that is currently spawning or is in a spawn queue DOES count towards the potency.
    const livingCreeps = _.filter(Game.creeps, (o) => !o.memory.isElderly &&
        o.memory.role === role &&
        o.memory.assignedRoomName === roomName &&
        (!subRole || o.memory.subRole === subRole) &&
        (!assignmentId || o.memory.assignmentId === assignmentId));
    const potencyFromLivingCreeps = _.sum(livingCreeps, (o) => getCreepPotency(o.body.map(p => p.type), role));
    const potencyFromSpawnQueue = spawnQueue.getPotency(roomName, role, subRole, assignmentId);
    return potencyFromLivingCreeps + potencyFromSpawnQueue;
}
function getCreepPotency(body, role) {
    if (role === 'builder')
        return util.countBodyParts(body, WORK);
    if (role === 'harvester')
        return util.countBodyParts(body, WORK);
    if (role === 'transporter')
        return util.countBodyParts(body, CARRY);
    if (role === 'hub')
        return util.countBodyParts(body, CARRY);
}
//# sourceMappingURL=manager.spawn.orders.js.map