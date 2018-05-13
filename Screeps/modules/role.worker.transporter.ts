import * as map from './map';
import * as util from './util';
import * as structureLink from './structure.link';

export function run(creep: Creep) {

    var assignedRoom = Game.rooms[creep.memory.assignedRoomName];
    var homeRoom = Game.rooms[creep.memory.homeRoomName];

    var totalCarry = _.sum(creep.carry);
    var threatLevel = util.getThreatLevel(creep.room);

    // filter and sort assignments
    if (!creep.memory.assignments) creep.memory.assignments = [];
    var assignments = _.sortBy(_.filter(creep.memory.assignments, o => !isAssignmentCompleted(o)), o => o.priority);
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
        var assignment = assignments.length ? Game.getObjectById(assignments[0].id) : null;
        if (isAssignmentMineralContainer(assignment)) {
            // assignment is a mining container for minerals. this is the one type of assignment that requires collecting instead of delivering.
            collectMinerals(assignment);
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

    function collectMinerals(target) {
        for (let i in target.store) {
            if (target.store[i] > 0) {
                if (creep.withdraw(target, i) == ERR_NOT_IN_RANGE) {
                    util.setMoveTarget(creep, target, 1);
                    return;
                }
                if (_.sum(creep.carry) === creep.carryCapacity) {
                    return;
                }
            }
        }
    }

    function findCollectTarget() {

        var droppedResources = assignedRoom.find(FIND_DROPPED_RESOURCES).map(o => { return { target: o, value: getDroppedResourcesValue(o) }; });

        const stores = assignedRoom.find<Container | Storage>(FIND_STRUCTURES, {
            filter: o => (util.isContainer(o) || util.isStorage(o)) && o.store[RESOURCE_ENERGY] > 0
        }).map(o => {
            return { target: o, value: getStoreValue(o) };
        });

        const links = assignedRoom.find<Link>(FIND_MY_STRUCTURES, {
            filter: o => util.isLink(o) && o.energy > 0 && structureLink.isDestination(o)
        }).map(o => {
            return { target: o, value: getLinkValue(o) };
        });

        const targets = util.filter(droppedResources.concat(stores).concat(links), o => o.value > -10000);
        return util.getBestValue(targets);

        function getDroppedResourcesValue(droppedResources) {
            var value = getCollectTargetValue(droppedResources, o => o.amount);
            if (droppedResources.resourceType == RESOURCE_ENERGY) {
                if (droppedResources.amount < 50) {
                    // it's not worth traveling to pick up a tiny amount of energy
                    return value - 1000;
                }
                return value + 18;
            }
            // minerals are more valuable than energy
            return value + 28;
        }

        function getStoreValue(store: Container | Storage) {
            var value = getCollectTargetValue(store, o => o.store[RESOURCE_ENERGY]);
            if (store.pos.findInRange(FIND_SOURCES, 2).length || store.pos.findInRange(FIND_MINERALS, 2).length) {
                // store is a mining container
                value += 8;
            } else {
                // only pull from storage under special circumstances
                var consumptionMode = util.getRoomMemory(creep.memory.assignedRoomName).consumptionMode;
                if (!threatLevel && !Memory['siegeMode'] && !consumptionMode && !isSpawnHungry()) {
                    value -= 1000000;
                }
            }
            return value;

            function isSpawnHungry() {
                return assignedRoom.energyAvailable < assignedRoom.energyCapacityAvailable;
            }
        }

        function getLinkValue(link) {
            return getCollectTargetValue(link, o => o.energy) + 12;
        }

        function getCollectTargetValue(target, energyFunc) {
            var value = 10 * Math.min(2, energyFunc(target) / (creep.carryCapacity - creep.carry.energy));
            const path = creep.pos.findPathTo(target.pos);
            value -= path.length;
            return value;
        }
    }

    function deliver() {
        if (!homeRoom) {
            console.log('WARNING: no home room for creep ' + creep.name + ' (homeRoomName: ' + creep.memory.homeRoomName + ')');
            return;
        }
        // if creep is carrying any minerals, deliver them to storage
        if (creep.carry.energy !== totalCarry) {
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
        var deliveryAssignments = _.filter(assignments, o => !isAssignmentMineralContainer(o));
        var assignment = (deliveryAssignments.length ? Game.getObjectById<Structure>(deliveryAssignments[0].id) : null);
        // if there's no assignment, deliver to storage
        if (!assignment) {
            assignment = homeRoom.storage || findConvenienceContainerForDelivery(homeRoom);
        }
        if (assignment) {
            if (creep.room !== assignment.room) {
                map.navigateToRoom(creep, assignment.room.name);
                return;
            }
            // look at links. we may be able to deliver more efficiently by sending energy through a link.
            var links: Link[] = assignment.room.find(FIND_MY_STRUCTURES, {
                filter: o => o.structureType == STRUCTURE_LINK
            });
            var closestSourceLink = creep.pos.findClosestByPath(links, { filter: o => structureLink.isSource(o) });
            var closestDestinationLink = creep.pos.findClosestByPath(links, { filter: o => structureLink.isDestination(o) });
            if (closestSourceLink && closestDestinationLink) {
                var distanceA = creep.pos.findPathTo(closestSourceLink.pos).length;
                var distanceB = assignment.pos.findPathTo(closestDestinationLink.pos).length;
                var distanceC = creep.pos.findPathTo(assignment.pos).length;
                if (distanceA + distanceB < distanceC) {
                    assignment = closestSourceLink;
                }
            }
            // try to transfer to assignment
            const transferResult = creep.transfer(assignment, RESOURCE_ENERGY);
            if (transferResult == ERR_NOT_IN_RANGE) {
                util.setMoveTarget(creep, assignment, 1);
            }
            else if (transferResult === OK) {
                if (assignment.structureType === STRUCTURE_EXTENSION || assignment.structureType === STRUCTURE_SPAWN) {
                    util.refreshSpawn(assignment.room.name);
                }
                if (creep.memory.assignedRoomName !== creep.memory.homeRoomName) {
                    const remoteMiningMetrics = Memory.remoteMiningMetrics || {};
                    const roomMetrics = remoteMiningMetrics[creep.memory.assignedRoomName] || { cost: 0, income: 0 };
                    roomMetrics.income += Math.min(creep.carry.energy, util.getEmptySpace(assignment));
                    remoteMiningMetrics[creep.memory.assignedRoomName] = roomMetrics;
                    Memory.remoteMiningMetrics = remoteMiningMetrics;
                }
            }
            return;
        }
    }

    function findConvenienceContainerForDelivery(room) {
        var convenienceContainers = room.find(FIND_STRUCTURES, {
            filter: o =>
                util.isContainer(o)
                && !o.pos.findInRange(FIND_SOURCES, 2).length
                && _.sum(o.store) <= o.storeCapacity - creep.carry.energy
        });
        return convenienceContainers[0];
    }

    function isAssignmentMineralContainer(assignment) {
        return assignment && util.isContainer(assignment) && assignment.pos.findInRange(FIND_MINERALS, 2).length;
    }

    function isAssignmentCompleted(assignment) {
        const target: any = Game.getObjectById(assignment.id);
        return !target
            || (target.energyCapacity && target.energy === target.energyCapacity)
            || (target.storeCapacity && target.store[RESOURCE_ENERGY] == target.storeCapacity);
    }
}