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

    // remote transporters can spontaneously unload energy into empty convenience containers they happen to pass by
    if (creep.memory.role === 'transporter' && util.isCreepRemote(creep) && creep.carry.energy > 0 && !creep.memory.isCollecting) {

        const nearbyConvenienceContainers = creep.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
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

    // refresh the move target every once in a while in case it's a dead end
    if (Game.time % 157 === 0) {
        util.setMoveTarget(creep, null);
    }

    // if creep has a move target, move to it. then don't do any more calculations until creep reaches that target, to save CPU.
    if (util.moveToMoveTarget(creep)) return true;

    if (!Game.rooms[creep.memory.assignedRoomName]) {
        map.navigateToRoom(creep, creep.memory.assignedRoomName);
        return true;
    }

    return false;
}