import * as util from './util';
import * as cache from './cache';
import { benchmark } from './util.benchmarking';

export function run(creep: Creep) {

    var room = Game.rooms[creep.memory.assignedRoomName];

    var assignment = Game.getObjectById<Source>(creep.memory.assignmentId);
    if (!assignment) return;

    if (creep.store.getFreeCapacity() > 0) {
        // harvest
        if (creep.harvest(assignment) === ERR_NOT_IN_RANGE) {
            util.setMoveTarget(creep, assignment, 1);
        }
        return;
    }

    if (tryTransferToLink()) return;
    if (tryTransferToContainer()) return;

    var spawn = room.find(FIND_MY_SPAWNS)[0];
    if (spawn) {
        // the creep and the container are both full, so the creep can't do anything.
        // it should deliver this energy to the spawn if there is one.
        util.deliverToSpawn(creep, spawn);
        return;
    }

    // there's nowhere to put the resources, so just drop them on the ground.
    for (var resourceType in creep.store) {
        creep.drop(resourceType as any);
    }

    function tryTransferToLink(): boolean {
        const miningLinkId = cache.get('e5077275-8afc-4b70-9a6e-448adb64b2c7-' + assignment.id, 41, () => {
            return room.find<StructureLink>(FIND_MY_STRUCTURES, {
                filter: o => util.isLink(o) && o.pos.inRangeTo(assignment.pos, 2)
            }).map(o => o.id)[0];
        });
        const miningLink = Game.getObjectById(miningLinkId);
        if (miningLink && miningLink.energy < miningLink.energyCapacity) {
            util.transferTo(creep, miningLink);
            return true;
        }
        return false;
    }

    function tryTransferToContainer(): boolean {
        const miningContainerId = cache.get('b177441a-45dd-4b8b-b704-5c9601bbce74-' + assignment.id, 41, () => {
            return room.find<StructureContainer>(FIND_STRUCTURES, {
                filter: o => util.isContainer(o) && o.pos.inRangeTo(assignment.pos, 2)
            }).map(o => o.id)[0];
        });
        const miningContainer = Game.getObjectById(miningContainerId);
        if (miningContainer && miningContainer.store.getFreeCapacity() > 0) {
            util.transferTo(creep, miningContainer);
            return true;
        }
        return false;
    }
}