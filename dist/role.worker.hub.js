"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
function run(creep) {
    const structures = creep.pos.findInRange(FIND_MY_STRUCTURES, 1);
    const storage = util.filter(structures, o => util.isStorage(o))[0];
    if (!storage)
        return;
    const terminal = util.filter(structures, o => util.isTerminal(o))[0];
    const totalCarry = creep.store.getUsedCapacity();
    // 1. if hub is empty, collect from dropped resources, link, storage, or terminal
    if (totalCarry === 0) {
        const droppedResources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
        if (droppedResources.length) {
            creep.pickup(droppedResources[0]);
            return;
        }
        const links = util.filter(structures, o => util.isLink(o));
        const nonEmptyLinks = _.filter(links, (o) => o.energy > 0);
        if (nonEmptyLinks.length) {
            creep.withdraw(nonEmptyLinks[0], RESOURCE_ENERGY);
            return;
        }
        var consumptionMode = util.getRoomMemory(creep.memory.assignedRoomName).consumptionMode;
        if (!consumptionMode && terminal && terminal.store[RESOURCE_ENERGY] > 0) {
            creep.withdraw(terminal, RESOURCE_ENERGY);
            return;
        }
        creep.withdraw(storage, RESOURCE_ENERGY);
        return;
    }
    const nonFullTowers = _.sortBy(util.filter(structures, o => util.isTower(o) && o.energy < Math.max(o.energyCapacity - creep.store.getCapacity(), o.energyCapacity / 2)), o => o.energy);
    const nonFullSpawns = util.filter(structures, o => util.isSpawn(o) && o.energy < o.energyCapacity);
    // 2. if tower or spawn needs energy, deliver
    if (creep.store[RESOURCE_ENERGY] > 0 && (nonFullTowers.length || nonFullSpawns.length)) {
        if (nonFullSpawns.length) {
            creep.transfer(nonFullSpawns[0], RESOURCE_ENERGY);
            return;
        }
        if (nonFullTowers.length) {
            creep.transfer(nonFullTowers[0], RESOURCE_ENERGY);
            return;
        }
    }
    // 3. if link is not empty, deliver to storage or terminal
    if (totalCarry > 0) {
        for (let i in creep.store) {
            const resource = i;
            if (_.sum(storage.store) < storage.storeCapacity * .998) {
                creep.transfer(storage, resource);
            }
            else if (terminal) {
                creep.transfer(terminal, resource);
            }
        }
    }
}
exports.run = run;
//# sourceMappingURL=role.worker.hub.js.map