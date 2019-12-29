import * as util from './util';
import * as linkLogic from './structure.link';

export function run(creep: Creep) {

    const structures = creep.pos.findInRange(FIND_MY_STRUCTURES, 1);

    const storage = util.filter(structures, o => util.isStorage(o))[0] as StructureStorage;
    if (!storage) return;

    const terminal = util.filter(structures, o => util.isTerminal(o))[0] as StructureTerminal;

    const totalCarry = creep.store.getUsedCapacity();

    // 1. if hub is empty, collect from dropped resources, link, storage, or terminal
    if (totalCarry === 0) {
        const droppedResources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
        if (droppedResources.length) {
            creep.pickup(droppedResources[0]);
            return;
        }
        const destinationLinks = util.filter(structures, o => util.isLink(o) && linkLogic.isDestination(o));
        const nonEmptyDestinationLinks = _.filter(destinationLinks, (o: StructureLink) => o.energy > 0);
        if (nonEmptyDestinationLinks.length) {
            creep.withdraw(nonEmptyDestinationLinks[0], RESOURCE_ENERGY);
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

    var nonFullTowers = util.filter(structures, o => util.isTower(o) &&
        o.energy < Math.max(o.energyCapacity - creep.store.getCapacity(), o.energyCapacity / 2)) as Array<StructureTower>;

    nonFullTowers = util.sortBy(nonFullTowers, o => o.energy);

    const nonFullSpawns = util.filter(structures, o => util.isSpawn(o) && o.energy < o.energyCapacity);

    const nonFullSourceLinks = util.filter(structures, o => util.isLink(o) && linkLogic.isSource(o) && o.energy < o.energyCapacity);

    // 2. if tower or spawn needs energy, deliver
    if (creep.store[RESOURCE_ENERGY] > 0 && (nonFullTowers.length || nonFullSpawns.length || nonFullSourceLinks.length)) {
        if (nonFullSpawns.length) {
            creep.transfer(nonFullSpawns[0], RESOURCE_ENERGY);
            return;
        }
        if (nonFullTowers.length) {
            creep.transfer(nonFullTowers[0], RESOURCE_ENERGY);
            return;
        }
        if (nonFullSourceLinks.length) {
            creep.transfer(nonFullSourceLinks[0], RESOURCE_ENERGY);
            return;
        }
    }

    // 3. deliver to storage or terminal
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