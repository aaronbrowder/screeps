import * as util from './util';
import * as enums from './enums';

export function assignBuilders() {

    // switch modes first; this can dump assignments
    switchModes();

    // items by priority
    // 1. controller at level 1
    // 2. wall or rampart with < 1000 hits
    // 3. wall or rampart construction site
    // 4. controller critically downgrading
    // 5. significantly damaged structure besides roads, walls, and ramparts
    // 6. container construction site
    // 7. spawn or storage construction site
    // 8. significantly damaged road
    // 9. extension construction site when number of extensions < 5
    // 10. road construction site over a swamp
    // 12. other non-road construction site
    // 13. road construction site

    for (let roomName in Game.rooms) {

        var builders = [];
        for (let i in Game.creeps) {
            var creep = Game.creeps[i];
            if (creep.memory.role === enums.BUILDER && creep.memory.assignedRoomName === roomName) {
                builders.push(creep);
            }
        }

        // only do assignments if there is a builder with no assignment or on the 11th tick, to save CPU
        if (builders.every(o => !!o.memory.assignmentId) && Game.time % 11 !== 0) continue;

        var room = Game.rooms[roomName];
        var terrain = Game.map.getRoomTerrain(roomName);
        var isMyRoom = room.controller && room.controller.my;
        var structures = room.find<Structure>(FIND_STRUCTURES);
        var constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
        var extensions = room.find<StructureExtension>(FIND_MY_STRUCTURES, { filter: o => o.structureType === STRUCTURE_EXTENSION });

        for (let i in structures) {
            let target = structures[i];
            if (target.structureType == STRUCTURE_CONTROLLER && (target as StructureController).level === 1) {
                assign(target, 1);
            }
            else if ((target.structureType == STRUCTURE_RAMPART || target.structureType == STRUCTURE_WALL) && target.hits < 1000) {
                assign(target, 2);
            }
            else if (target.structureType == STRUCTURE_CONTROLLER && isCriticallyDowngrading(target)) {
                assign(target, 4);
            }
            else if (target.structureType != STRUCTURE_RAMPART && target.structureType != STRUCTURE_WALL && target.structureType != STRUCTURE_ROAD
                && target.hits < target.hitsMax * 0.6) {
                assign(target, 5);
            }
            else if (target.structureType == STRUCTURE_ROAD && target.hits < target.hitsMax * 0.6) {
                assign(target, 8);
            }
        }

        for (let i in constructionSites) {
            let target = constructionSites[i];
            let pos = target.pos;
            if (target.structureType == STRUCTURE_WALL || target.structureType == STRUCTURE_RAMPART) {
                assign(target, 3);
            }
            else if (target.structureType == STRUCTURE_SPAWN || target.structureType === STRUCTURE_STORAGE) {
                assign(target, 7);
            }
            else if (target.structureType == STRUCTURE_EXTENSION && extensions.length < 5) {
                assign(target, 9);
            }
            else if (target.structureType == STRUCTURE_ROAD && terrain.get(pos.x, pos.y) === TERRAIN_MASK_SWAMP) {
                assign(target, 10);
            }
            else if (target.structureType == STRUCTURE_CONTAINER) {
                assign(target, 6);
            }
            else if (target.structureType != STRUCTURE_ROAD) {
                assign(target, 12);
            }
            else {
                assign(target, 13);
            }
        }

        function assign(target, priority) {
            // roads, controllers, and finished structures (needing repair) can only have one builder assigned at a time.
            // this is so we don't have every builder in the room rushing to repair a single road, etc.
            if (target.structureType == STRUCTURE_ROAD || target.hitsMax ||
                (target.structureType == STRUCTURE_CONTROLLER && (target as StructureController).level > 1)) {
                const buildersAlreadyAssignedToThisTarget = _.filter(builders, o => o.memory.assignmentId === target.id);
                if (buildersAlreadyAssignedToThisTarget.length) {
                    return;
                }
            }
            const potentialAssignees = _.filter(builders, o => !o.memory.assignmentId || o.memory.assignmentPriority > priority);
            if (potentialAssignees.length) {
                const builder = target.pos.findClosestByPath(potentialAssignees);
                if (builder) {
                    builder.memory.assignmentId = target.id;
                    builder.memory.assignmentPriority = priority;
                }
            }
        }
    }
}

function isCriticallyDowngrading(controller) {
    if (controller.level < 3) {
        return controller.ticksToDowngrade < 2000;
    }
    if (controller.level === 3) {
        return controller.ticksToDowngrade < 7000;
    }
    if (controller.level === 4) {
        return controller.ticksToDowngrade < 14000;
    }
    if (controller.level > 4) {
        return controller.ticksToDowngrade < 20000;
    }
}

export function isDowngrading(controller) {
    if (controller.level < 3) {
        return controller.ticksToDowngrade < 4500;
    }
    if (controller.level === 3) {
        return controller.ticksToDowngrade < 9000;
    }
    if (controller.level === 4) {
        return controller.ticksToDowngrade < 17000;
    }
    if (controller.level > 4) {
        return controller.ticksToDowngrade < 24000;
    }
}

function switchModes() {
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        if (creep.memory.role !== enums.BUILDER) continue;
        // if creep is empty, switch to collect mode
        if (!creep.memory.isCollecting && creep.store[RESOURCE_ENERGY] === 0) {
            switchModes(true);
        }
        // if creep is full, switch to deliver mode
        if (creep.memory.isCollecting && creep.store[RESOURCE_ENERGY] === creep.store.getCapacity()) {
            switchModes(false);
        }
        function switchModes(isCollecting) {
            creep.memory.isCollecting = isCollecting;
            creep.memory.assignmentId = null;
            creep.memory.preferredWallId = null;
            util.setMoveTarget(creep, null);
        }
    }
}