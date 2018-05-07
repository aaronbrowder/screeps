"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
function run(creep) {
    const storage = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, { filter: o => util.isStorage(o) })[0];
    if (!storage)
        return;
    const totalCarry = _.sum(creep.carry);
    // 1. if hub is empty, collect from dropped resources, link, or storage
    if (totalCarry === 0) {
        const droppedResources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
        if (droppedResources.length) {
            creep.pickup(droppedResources[0]);
            return;
        }
        const links = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, { filter: o => util.isLink(o) });
        const nonEmptyLinks = _.filter(links, (o) => o.energy > 0);
        if (nonEmptyLinks.length) {
            creep.withdraw(nonEmptyLinks[0], RESOURCE_ENERGY);
            return;
        }
        creep.withdraw(storage, RESOURCE_ENERGY);
        return;
    }
    const nonFullTowers = _.sortBy(creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {
        filter: o => util.isTower(o) && o.energy < o.energyCapacity
    }), o => o.energy);
    const nonFullSpawns = creep.pos.findInRange(FIND_MY_SPAWNS, 1, {
        filter: (o) => o.energy < o.energyCapacity
    });
    // 2. if tower or spawn needs energy, deliver
    if (creep.carry[RESOURCE_ENERGY] > 0 && (nonFullTowers.length || nonFullSpawns.length)) {
        if (nonFullSpawns.length) {
            creep.transfer(nonFullSpawns[0], RESOURCE_ENERGY);
            return;
        }
        if (nonFullTowers.length) {
            creep.transfer(nonFullTowers[0], RESOURCE_ENERGY);
            return;
        }
    }
    // 3. if link is not empty, deliver to storage
    if (totalCarry > 0) {
        for (let i in creep.carry) {
            creep.transfer(storage, i);
        }
    }
}
exports.run = run;
//# sourceMappingURL=role.worker.hub.js.map