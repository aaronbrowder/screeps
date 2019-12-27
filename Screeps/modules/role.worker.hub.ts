import * as util from './util';

export function run(creep: Creep) {

    const storage = creep.pos.findInRange<StructureStorage>(FIND_MY_STRUCTURES, 1, { filter: o => util.isStorage(o) })[0];
    if (!storage) return;

    const terminal = creep.pos.findInRange<StructureStorage>(FIND_MY_STRUCTURES, 1, { filter: o => util.isTerminal(o) })[0];

    const totalCarry = _.sum(creep.store);

    // 1. if hub is empty, collect from dropped resources, link, storage, or terminal
    if (totalCarry === 0) {
        const droppedResources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
        if (droppedResources.length) {
            creep.pickup(droppedResources[0]);
            return;
        }
        const links = creep.pos.findInRange<StructureLink>(FIND_MY_STRUCTURES, 1, { filter: o => util.isLink(o) });
        const nonEmptyLinks = _.filter(links, (o: StructureLink) => o.energy > 0);
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

    const nonFullTowers: StructureTower[] = _.sortBy(creep.pos.findInRange<StructureTower>(FIND_MY_STRUCTURES, 1, {
        filter: o => util.isTower(o) && o.energy < Math.max(o.energyCapacity - creep.store.getCapacity(), o.energyCapacity / 2)
    }), o => o.energy);

    const nonFullSpawns = creep.pos.findInRange(FIND_MY_SPAWNS, 1, {
        filter: (o: StructureSpawn) => o.energy < o.energyCapacity
    });

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
            const resource = i as ResourceConstant;
            if (_.sum(storage.store) < storage.storeCapacity * .998) {
                creep.transfer(storage, resource);
            } else if (terminal) {
                creep.transfer(terminal, resource);
            }
        }
    }
}