var map = require('map');
var util = require('util');

module.exports = {
    run: function(creep) {

        // const nearbyHostiles = _.filter(creep.room.find(FIND_HOSTILE_CREEPS), o => 
        //     o.body.some(p => p.type == ATTACK || p.type == RANGED_ATTACK) && o.pos.inRangeTo(creep.pos, 5)
        // );
        // if (nearbyHostiles.length) {
        //     // there are hostiles nearby. if they are within firing range, we want to move away.
        //     // either way, we want to cancel all normal worker activities.
        //     const hostilesInRange = _.filter(creep.room.find(FIND_HOSTILE_CREEPS), o => 
        //         (o.getActiveBodyparts(ATTACK) > 0 && o.pos.inRangeTo(creep.pos, 1)) ||
        //         (o.getActiveBodyparts(RANGED_ATTACK) > 0 && o.pos.inRangeTo(creep.pos, 3)));
                
        //     if (hostilesInRange.length) {
        //         const spawn = util.findNearestStructure(creep.pos, STRUCTURE_SPAWN);
        //         if (spawn) {
        //             creep.moveTo(spawn);
        //         }
        //     }
        //     // returning true means the worker will not try to perform any additional actions this tick.
        //     return true;
        // }
        
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
        
        // if creep has a move target, move to it. then don't do any more calculations until creep reaches that target, to save CPU.
        if (util.moveToMoveTarget(creep)) return true;
        
        if (!Game.rooms[creep.memory.assignedRoomName]) {
            map.navigateToRoom(creep, creep.memory.assignedRoomName);
            return true;
        }
        
        return false;
    }
};