var util = require('util');

module.exports = {
    run: function(creep) {
        
        var room = Game.rooms[creep.memory.assignedRoomName];
        
        var assignment = Game.getObjectById(creep.memory.assignmentId);
        if (!assignment) return;

        if (_.sum(creep.carry) < creep.carryCapacity) {
            // harvest
            if (creep.harvest(assignment) == ERR_NOT_IN_RANGE) {
                util.setMoveTarget(creep, assignment, 1);
            }
            return;
        }
        
        var miningLink = Game.getObjectById(creep.memory.miningLinkId);
        if (!miningLink) {
            miningLink = room.find(FIND_STRUCTURES, { filter: o =>
                o.structureType == STRUCTURE_LINK && o.pos.inRangeTo(assignment.pos, 2)
            })[0];
            if (miningLink) {
                creep.memory.miningLinkId = miningLink.id;
            }
        }
        if (miningLink && miningLink.energy < miningLink.energyCapacity) {
            util.transferTo(creep, miningLink);
            return;
        }
        
        var miningContainer = Game.getObjectById(creep.memory.miningContainerId);
        if (!miningContainer) {
            miningContainer = room.find(FIND_STRUCTURES, { filter: o =>
                o.structureType == STRUCTURE_CONTAINER && o.pos.inRangeTo(assignment.pos, 2)
            })[0];
            if (miningContainer) {
                creep.memory.miningContainerId = miningContainer.id;
            }
        }
        if (miningContainer && _.sum(miningContainer.store) < miningContainer.storeCapacity) {
            util.transferTo(creep, miningContainer);
            return;
        }
        
        var spawn = room.find(FIND_MY_SPAWNS)[0];
        if (spawn) {
            // the creep and the container are both full, so the creep can't do anything.
            // it should deliver this energy to the spawn if there is one.
            util.deliverToSpawn(creep, spawn);
            return;
        }
        
        // there's nowhere to put the resources, so just drop them on the ground.
        for (var resourceType in creep.carry) {
            creep.drop(resourceType);
        }
    }
};