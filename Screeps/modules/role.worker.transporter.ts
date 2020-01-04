import * as map from './map';
import * as util from './util';
import * as enums from './enums';

export function run(creep: Creep) {

    var assignedRoom = Game.rooms[creep.memory.assignedRoomName];
    var homeRoom = Game.rooms[creep.memory.homeRoomName];

    var totalCarry = creep.store.getUsedCapacity();
    var threatLevel = util.getThreatLevel(creep.room);

    // filter and sort assignments
    if (!creep.memory.assignments) creep.memory.assignments = [];
    var assignments = util.sortBy(util.filter(creep.memory.assignments, o => !isAssignmentCompleted(o)), o => o.priority);
    creep.memory.assignments = assignments;

    if (creep.memory.isCollecting) {
        var result = collect();
        if (!result) {
            creep.memory.isCollecting = false;
        }
    }
    if (!creep.memory.isCollecting) {
        deliver();
    }

    function collect() {
        if (creep.store.getFreeCapacity() === 0) {
            return false;
        }
        var assignment = assignments.length ? Game.getObjectById(assignments[0].id) : null;
        if (isAssignmentMiningContainer(assignment)) {
            // assignment is a mining container. this is the one type of assignment that requires collecting instead of delivering.
            collectFromMiningContainer(assignment);
            return true;
        } else {
            var target: any = findCollectTarget();
            if (target) {
                var pickupResult = creep.pickup(target);
                if (pickupResult == ERR_NOT_IN_RANGE) {
                    util.setMoveTarget(creep, target, 1);
                }
                else if (pickupResult == ERR_INVALID_TARGET) {
                    if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        util.setMoveTarget(creep, target, 1);
                    }
                }
                return true;
            }
        }
        return false;
    }

    function collectFromMiningContainer(target: StructureContainer) {
        for (let i in target.store) {
            const resource = i as ResourceConstant;
            if (target.store[resource] > 0) {
                if (creep.withdraw(target, resource) == ERR_NOT_IN_RANGE) {
                    util.setMoveTarget(creep, target, 1);
                    return;
                }
                if (_.sum(creep.store) === creep.store.getCapacity()) {
                    return;
                }
            }
        }
    }

    function findCollectTarget() {

        interface CollectTarget {
            target: RoomObject;
            value: number;
        }

        var droppedResources: Array<CollectTarget> = assignedRoom.find(FIND_DROPPED_RESOURCES).map(o => {
            return { target: o, value: getDroppedResourcesValue(o) };
        });

        var tombstones: Array<CollectTarget> = assignedRoom.find(FIND_TOMBSTONES).map(o => {
            return { target: o, value: getTombstoneValue(o) };
        });

        const roomHasStorage = assignedRoom.find(FIND_STRUCTURES, { filter: o => util.isStorage(o) }).length > 0;

        const stores: Array<CollectTarget> = assignedRoom.find<StructureContainer | StructureStorage>(FIND_STRUCTURES, {
            filter: o => (util.isContainer(o) || util.isStorage(o)) && o.store[RESOURCE_ENERGY] > 0
        }).map(o => {
            return { target: o, value: getStorageValue(o) };
        });

        const destinationLinks = util.findLinks(assignedRoom, enums.LINK_DESTINATION);
        const links: Array<CollectTarget> = util.filter(destinationLinks, o => o.energy > 0).map(o => {
            return { target: o, value: getLinkValue(o) };
        });

        const targets = util.filter(droppedResources.concat(tombstones).concat(stores).concat(links), o => o.value > -10000);
        return util.getBestValue(targets);

        function getDroppedResourcesValue(resource: Resource) {
            // ignore dropped resources when there is a threat
            if (threatLevel) return -1000000;
            // adjust the amount so we ignore small piles but highly value large piles
            var adjustedAmount = Math.pow(resource.amount, 2) / 100;
            // we value non-energy resources twice as much as energy
            if (resource.resourceType !== RESOURCE_ENERGY) {
                adjustedAmount *= 2;
            }
            const value = getResourceCollectTargetValue(resource, adjustedAmount);
            return getResourceValue(resource.resourceType, resource.amount, value);
        }

        function getTombstoneValue(tombstone: Tombstone) {
            // ignore tombstones when there is a threat
            if (threatLevel) return -1000000;
            const nonEnergyWeightFactor = 2;
            return getStoreCollectTargetValue(tombstone, tombstone.store, nonEnergyWeightFactor);
        }

        function getResourceValue(type: ResourceConstant, amount: number, baseValue: number) {
            if (type == RESOURCE_ENERGY) {
                if (amount < 50) {
                    // it's not worth traveling to pick up a tiny amount of energy
                    return baseValue - 1000;
                }
                return baseValue + 18;
            }
            // minerals are more valuable than energy
            return baseValue + 28;
        }

        function getStorageValue(storage: StructureContainer | StructureStorage) {
            // we don't care about collecting non-energy resources from storage
            const nonEnergyWeightFactor = 0;
            var value = getStoreCollectTargetValue(storage, storage.store, nonEnergyWeightFactor);
            if (storage.pos.findInRange(FIND_SOURCES, 2).length || storage.pos.findInRange(FIND_MINERALS, 2).length) {
                // store is a mining container
                if (threatLevel) return -1000000;
                value += 8;
            } else if (roomHasStorage && storage.structureType === STRUCTURE_CONTAINER) {
                // store is a convenience container
                if (threatLevel) return -1000000;
                value -= 40;
            }
            else {
                // only pull from storage under special circumstances
                var consumptionMode = util.getRoomMemory(creep.memory.assignedRoomName).consumptionMode;
                if (!threatLevel && !consumptionMode && !isSpawnHungry()) {
                    value -= 1000000;
                }
            }
            return value;

            function isSpawnHungry() {
                return assignedRoom.energyAvailable < assignedRoom.energyCapacityAvailable;
            }
        }

        function getLinkValue(link: StructureLink) {
            return getResourceCollectTargetValue(link, link.energy) + 12;
        }

        function getResourceCollectTargetValue<T extends RoomObject>(target: T, amount: number) {
            var value = 10 * Math.min(2, amount / creep.store.getFreeCapacity());
            const path = creep.pos.findPathTo(target.pos);
            value -= path.length;
            return value;
        }

        function getStoreCollectTargetValue<T extends RoomObject>(target: T, store: Store<ResourceConstant, false>, nonEnergyWeightFactor: number) {
            var amount = 0;
            for (let i in store) {
                if (i === RESOURCE_ENERGY) {
                    amount += store[i];
                } else {
                    amount += store[i] * nonEnergyWeightFactor;
                }
            }
            return getResourceCollectTargetValue(target, amount);
        }
    }

    function deliver() {
        if (!homeRoom) {
            console.log('WARNING: no home room for creep ' + creep.name + ' (homeRoomName: ' + creep.memory.homeRoomName + ')');
            return;
        }
        // transporters can only deliver to locations in their home room
        if (creep.room.name !== homeRoom.name) {
            map.navigateToRoom(creep, homeRoom.name);
            return;
        }
        // if creep is carrying any minerals, deliver them to storage
        if (creep.store[RESOURCE_ENERGY] !== totalCarry) {
            if (homeRoom.storage) {
                if (util.transferTo(creep, homeRoom.storage)) return;
            }
            // no storage in this room, so deliver to a container
            var container = creep.pos.findClosestByPath<Structure>(FIND_STRUCTURES, {
                filter: o => util.isContainer(o) && _.sum(o.store) < o.storeCapacity
            });
            if (container) {
                if (util.transferTo(creep, container)) return;
            }
        }
        // no minerals. deliver energy to assignment
        var deliveryAssignments = util.filter(assignments, o => !isAssignmentMiningContainer(Game.getObjectById(o.id)));
        var assignment = (deliveryAssignments.length ? Game.getObjectById<Structure>(deliveryAssignments[0].id) : null);
        // if there's no assignment, deliver to storage (or a link that goes to storage)
        if (!assignment) {
            assignment = findBestRepository();
        }
        if (assignment) {
            // try to transfer to assignment
            const transferResult = creep.transfer(assignment, RESOURCE_ENERGY);
            if (transferResult === ERR_NOT_IN_RANGE) {
                util.setMoveTarget(creep, assignment, 1);
            }
            return;
        }
    }

    function findBestRepository(): StructureStorage | StructureLink | StructureContainer {
        const room = creep.room;
        // if we would deliver to storage, see if we can send through a source link instead
        if (room.storage) {
            const distanceToStorage = creep.pos.findPathTo(room.storage).length;
            const links = util.filter(util.findLinks(room, enums.LINK_SOURCE), o => o.energy < o.energyCapacity);
            var bestLink = null;
            for (let i = 0; i < links.length; i++) {
                const distance = creep.pos.findPathTo(links[i]).length;
                if (distance < distanceToStorage) {
                    bestLink = links[i];
                }
            }
            return bestLink || room.storage;
        }
        // no storage in the room, so deliver to a convenience container if there is one
        const containers = util.findContainers(room);
        const convenienceContainers = util.filter(containers, o =>
            !o.pos.findInRange(FIND_SOURCES, 2).length &&
            !o.pos.findInRange(FIND_MINERALS, 2).length &&
            o.store.getFreeCapacity() >= creep.store.getUsedCapacity()
        );
        if (convenienceContainers.length) {
            return convenienceContainers[0];
        }
        return null;
    }

    function isAssignmentMiningContainer(assignment: Structure): assignment is StructureContainer {
        return assignment && util.isContainer(assignment) &&
            (assignment.pos.findInRange(FIND_MINERALS, 2).length > 0 ||
                assignment.pos.findInRange(FIND_SOURCES, 2).length > 0);
    }

    function isAssignmentCompleted(assignment: TransporterAssignment) {
        const target: any = Game.getObjectById(assignment.id);
        return !target
            || (target.energyCapacity && target.energy === target.energyCapacity)
            || (target.storeCapacity && target.store[RESOURCE_ENERGY] == target.storeCapacity);
    }
}