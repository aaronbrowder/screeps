"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const idealsManager = require("./manager.spawn.ideals");
function getRoomOrder(roomName, doClaim, wartime) {
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
    return {
        roomName: roomName,
        transporterPotency: transporterPotencyNeeded,
        wallBuilderPotency: wallBuilderPotencyNeeded,
        upgraderPotency: upgraderPotencyNeeded,
        hubPotency: hubPotencyNeeded
    };
}
exports.getRoomOrder = getRoomOrder;
function getSourceOrder(sourceOrMineralId, doClaim, wartime) {
    const sourceOrMineral = Game.getObjectById(sourceOrMineralId);
    if (!sourceOrMineral || !sourceOrMineral.room)
        return null;
    const roomName = sourceOrMineral.room.name;
    const ideals = idealsManager.getIdeals(roomName, doClaim, wartime);
    const potency = getPotency(roomName, 'harvester', undefined, sourceOrMineralId);
    const idealPotency = util.isSource(sourceOrMineral)
        ? ideals.harvesterPotencyPerSource
        : ideals.harvesterPotencyPerMineral;
    return {
        sourceOrMineralId: sourceOrMineralId,
        harvesterPotency: idealPotency - potency
    };
}
exports.getSourceOrder = getSourceOrder;
function getPotency(roomName, role, subRole, assignmentId) {
    // "Potency" is a measure of how much of a type of worker there is in a room. For example, for transporters,
    // potency measures the current capacity of that room to transport things, by counting the total number of
    // carry parts of all transporters working in the room.
    // * A creep with less than 100 ticks to live does not count towards the potency.
    // * A creep that is currently spawning or is in a spawn queue DOES count towards the potency.
    const creeps = _.filter(Game.creeps, (o) => o.ticksToLive >= 100 &&
        o.memory.role === role &&
        o.memory.assignedRoomName === roomName &&
        (!subRole || o.memory.subRole === subRole) &&
        (!assignmentId || o.memory.assignmentId === assignmentId));
    var potency = _.sum(creeps, (o) => getCreepPotency(o.body.map(p => p.type), role));
    for (let i in Game.spawns) {
        const spawn = Game.spawns[i];
        const queue = spawn.memory.queue;
        const filtered = _.filter(queue, (o) => o.role === role &&
            o.assignedRoomName === roomName &&
            (!subRole || o.subRole === subRole) &&
            (!assignmentId || o.assignmentId === assignmentId));
        potency += _.sum(filtered, (o) => o.potency);
    }
    return potency;
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