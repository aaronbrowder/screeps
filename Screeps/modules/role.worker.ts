import * as map from './map';
import * as util from './util';

export function run(creep: Creep) {

    if (creep.memory.assignedRoomName === creep.memory.homeRoomName) {
        const nearbyHostiles = _.filter(creep.room.find(FIND_HOSTILE_CREEPS), o =>
            o.body.some(p => p.type == ATTACK) && o.pos.inRangeTo(creep.pos, 2)
        );
        if (nearbyHostiles.length) {
            const spawn = util.findNearestStructure(creep.pos, STRUCTURE_SPAWN);
            if (spawn) {
                creep.memory.assignmentId = null;
                util.setMoveTarget(creep, null);
                creep.moveTo(spawn);
            }
            // returning true means the worker will not try to perform any additional actions this tick.
            return true;
        }
    } else {
        // the worker is not in its home room. it should be extra careful and go home if it's in any danger
        const nearbyHostiles = _.filter(creep.room.find(FIND_HOSTILE_CREEPS), o =>
            (o.body.some(p => p.type == ATTACK) && o.pos.inRangeTo(creep.pos, 2)) ||
            (o.body.some(p => p.type == RANGED_ATTACK) && o.pos.inRangeTo(creep.pos, 4))
        );
        if (nearbyHostiles.length) {
            map.navigateToRoom(creep, creep.memory.homeRoomName);
            // returning true means the worker will not try to perform any additional actions this tick.
            return true;
        }
    }

    // if the creep is standing on a road, record that the road has been used
    // const structures = creep.pos.lookFor(LOOK_STRUCTURES);
    // const road = _.filter(structures, o => o.structureType == STRUCTURE_ROAD)[0];
    // if (road) {
    //     Memory.roadUsage[road.id] = Game.time;
    // }

    // if the creep is not standing on a road, potentially build a road construction site
    // const constructionSites = creep.pos.lookFor(LOOK_CONSTRUCTION_SITES);
    // if (!road && !constructionSites.length) {
    //     var routeUsage = ((Memory.routeUsage[creep.room.name] || {})[creep.pos.x] || {})[creep.pos.y];
    //     // if the position has not been stepped on in more than 300 ticks, reset the count to 1
    //     if (!routeUsage || routeUsage.time < Game.time - 300) {
    //         routeUsage = { time: Game.time, count: 1 };
    //     }
    //     // if the position has been used in the last 15 ticks, we consider this to be a part of the same route
    //     // usage event. this could be a traffic jam detour or a creep doing work. let's only increment the count by a little.
    //     else if (routeUsage.time >= Game.time - 15) {
    //         routeUsage = { time: Game.time, count: routeUsage.count + 0.2 };
    //     }
    //     else {
    //         routeUsage = { time: Game.time, count: routeUsage.count + 1 };
    //     }
    //     // if this is the fourth time the position has been stepped on, we should build a road.
    //     if (routeUsage.count >= 4) {
    //         creep.room.createConstructionSite(creep.pos, STRUCTURE_ROAD);
    //     }
    //     if (!Memory.routeUsage[creep.room.name]) {
    //         Memory.routeUsage[creep.room.name] = {};
    //     }
    //     if (!Memory.routeUsage[creep.room.name][creep.pos.x]) {
    //         Memory.routeUsage[creep.room.name][creep.pos.x] = {};
    //     }
    //     Memory.routeUsage[creep.room.name][creep.pos.x][creep.pos.y] = routeUsage;
    // }

    // remote transporters can spontaneously unload energy into empty convenience containers they happen to pass by
    if (creep.memory.role === 'transporter' && util.isCreepRemote(creep) && creep.carry.energy > 0 && !creep.memory.isCollecting) {

        const nearbyConvenienceContainers = creep.pos.findInRange<Container>(FIND_STRUCTURES, 1, {
            filter: o => util.isContainer(o) && o.storeCapacity - _.sum(o.store) >= creep.carry.energy
                && !o.pos.findInRange(FIND_SOURCES, 2).length && !o.pos.findInRange(FIND_MINERALS, 2).length
        });
        if (nearbyConvenienceContainers.length) {
            if (creep.transfer(nearbyConvenienceContainers[0], RESOURCE_ENERGY) === OK) {
                util.setMoveTarget(creep, null);
                creep.memory.assignmentId = null;
            }
        }
    }

    // if creep has a move target, move to it. then don't do any more calculations until creep reaches that target, to save CPU.
    if (util.moveToMoveTarget(creep)) return true;

    if (!Game.rooms[creep.memory.assignedRoomName]) {
        map.navigateToRoom(creep, creep.memory.assignedRoomName);
        return true;
    }

    return false;
}