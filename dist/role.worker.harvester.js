"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const cache = require("./cache");
function run(creep) {
    var room = Game.rooms[creep.memory.assignedRoomName];
    var assignment = Game.getObjectById(creep.memory.assignmentId);
    if (!assignment)
        return;
    if (creep.store.getFreeCapacity() > 0) {
        // harvest
        if (creep.harvest(assignment) === ERR_NOT_IN_RANGE) {
            util.setMoveTarget(creep, assignment, 1);
        }
        return;
    }
    if (tryTransferToLink())
        return;
    if (tryTransferToContainer())
        return;
    var spawn = room.find(FIND_MY_SPAWNS)[0];
    if (spawn) {
        // the creep and the container are both full, so the creep can't do anything.
        // it should deliver this energy to the spawn if there is one.
        util.deliverToSpawn(creep, spawn);
        return;
    }
    // there's nowhere to put the resources, so just drop them on the ground.
    for (var resourceType in creep.store) {
        creep.drop(resourceType);
    }
    function tryTransferToLink() {
        const miningLinkId = cache.get('e5077275-8afc-4b70-9a6e-448adb64b2c7-' + assignment.id, 41, () => {
            return room.find(FIND_MY_STRUCTURES, {
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
    function tryTransferToContainer() {
        const miningContainerId = cache.get('b177441a-45dd-4b8b-b704-5c9601bbce74-' + assignment.id, 41, () => {
            return room.find(FIND_STRUCTURES, {
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
exports.run = run;
//# sourceMappingURL=role.worker.harvester.js.map