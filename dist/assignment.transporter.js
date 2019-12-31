"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const enums = require("./enums");
function assignTransporters() {
    // items by priority
    // 1. spawns
    // 2. extensions
    // 3. towers with < 85% (100% during wartime)
    // 4. mineral containers with > 33%
    // 5. convenience containers with < 85%
    for (let roomName in Game.rooms) {
        // switch modes first; this can dump assignments
        var dumped = switchModes(roomName);
        // only do assignments after a dump or on the 24th tick, to save CPU
        if (!dumped && Game.time % 24 !== 0)
            continue;
        const room = Game.rooms[roomName];
        // only do assignments in rooms that I control
        if (!room || !room.controller || !room.controller.my)
            continue;
        const structures = room.find(FIND_STRUCTURES);
        for (let i = 0; i < structures.length; i++) {
            const target = structures[i];
            if (util.isSpawn(target) && target.energy < target.energyCapacity) {
                assign(target, 1, target.energyCapacity - target.energy);
            }
            if (util.isExtension(target) && target.energy < target.energyCapacity) {
                assign(target, 2, target.energyCapacity - target.energy);
            }
            if (util.isTower(target)
                && target.energy < target.energyCapacity * (target.room.find(FIND_HOSTILE_CREEPS).length ? 1 : 0.85)) {
                assign(target, 3, target.energyCapacity - target.energy);
            }
            if (util.isContainer(target) && target.store.getUsedCapacity() > target.storeCapacity * 0.33
                && target.pos.findInRange(FIND_MINERALS, 2).length) {
                assign(target, 4, target.store.getUsedCapacity());
            }
            if (util.isContainer(target) && target.store.getUsedCapacity() < target.storeCapacity * 0.85
                && !target.pos.findInRange(FIND_SOURCES, 2).length && !target.pos.findInRange(FIND_MINERALS, 2).length) {
                assign(target, 5, target.store.getFreeCapacity());
            }
        }
    }
    function assign(target, priority, amountNeeded) {
        const transporters = [];
        for (let i in Game.creeps) {
            var creep = Game.creeps[i];
            if (creep.memory.role === enums.TRANSPORTER && creep.memory.assignedRoomName === target.room.name) {
                transporters.push(creep);
            }
        }
        const transportersAlreadyAssignedToThisTarget = util.filter(transporters, o => o.memory.assignments && o.memory.assignments.some(a => a.id === target.id));
        const supply = util.sum(transportersAlreadyAssignedToThisTarget, o => o.store.getCapacity());
        amountNeeded -= supply;
        if (amountNeeded <= 0) {
            return;
        }
        const sortedTransporters = util.sortBy(transporters, o => sortTransporters(target, o));
        for (let i = 0; i < sortedTransporters.length; i++) {
            const transporter = sortedTransporters[i];
            assignToTransporter(transporter, target, priority, amountNeeded);
            amountNeeded -= transporter.store.getCapacity();
            if (amountNeeded <= 0)
                break;
        }
    }
}
exports.assignTransporters = assignTransporters;
function assignToTransporter(transporter, target, priority, amountNeeded) {
    const distance = transporter.pos.findPathTo(target.pos).length;
    // add distance to priority so the creep will deliver to the closest assignment when multiple assignments have the same priority.
    priority = (100 * priority) + distance;
    if (!transporter.memory.assignments) {
        transporter.memory.assignments = [];
    }
    transporter.memory.assignments.push({
        id: target.id,
        amount: amountNeeded,
        priority: priority
    });
}
// we want to find a transporter which is close by and has a low workload and has low priority assignments.
// let's look 7 spaces away for every 1 workload on average (the average priority is 300).
// value = -(distance + (3.5 * workload * (600 - priority) / 600)).
// best creep has value closest to 0.
// so say we have a creep with a workload of 5 which is 3 spaces away: value = -38
// creep with a workload of 3 which is 6 spaces away: value = -27
// creep with a workload of 2 which is 10 spaces away: value = -24
// creep with a workload of 1 which is 30 spaces away: value = -37
// creep with a workload of 0 which is 30 spaces away: value = -30
function sortTransporters(target, transporter) {
    const path = transporter.pos.findPathTo(target);
    if (!path.length)
        return 1000;
    return path.length + ((3.5 / 600) * getWorkload(transporter));
}
function getWorkload(transporter) {
    // the workload is the number of round trips which will be required for this transporter to complete all of its assignments.
    // the workload is multiplied when the priority is high.
    const assignments = transporter.memory.assignments;
    if (!assignments || !assignments.length)
        return 0;
    return _.sum(assignments, o => o.amount * (600 - o.priority)) / transporter.store.getCapacity();
}
function switchModes(roomName) {
    var dump = false;
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        if (creep.memory.role !== enums.TRANSPORTER || creep.memory.assignedRoomName !== roomName)
            continue;
        // if creep is empty, switch to collect mode
        if (!creep.memory.isCollecting && _.sum(creep.store) === 0) {
            switchModes(true);
            dump = true;
        }
        // if creep is full, switch to deliver mode
        if (creep.memory.isCollecting && _.sum(creep.store) === creep.store.getCapacity()) {
            switchModes(false);
            dump = true;
        }
        function switchModes(isCollecting) {
            creep.memory.isCollecting = isCollecting;
            util.setMoveTarget(creep, null);
        }
    }
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        if (dump && creep.memory.role === enums.TRANSPORTER && creep.memory.assignedRoomName === roomName) {
            creep.memory.assignments = null;
        }
    }
    return dump;
}
//# sourceMappingURL=assignment.transporter.js.map