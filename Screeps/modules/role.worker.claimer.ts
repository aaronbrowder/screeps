import * as map from './map';
import * as util from './util';

export function run(creep) {

    if (creep.room.name !== creep.memory.assignedRoomName) {
        map.navigateToRoom(creep, creep.memory.assignedRoomName);
        return;
    }

    var controller = creep.room.controller;

    if (util.signController(creep, controller)) return;

    if (controller && !controller.my) {
        if (controller.owner) {
            if (creep.attackController(controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(controller);
            }
        }
        else if (creep.memory.doClaim) {
            var claimResult = creep.claimController(controller);
            if (claimResult == ERR_NOT_IN_RANGE) {
                creep.moveTo(controller);
            }
            else if (claimResult == ERR_GCL_NOT_ENOUGH) {
                creep.reserveController(controller);
            }
        }
        else {
            if (creep.reserveController(controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(controller);
            }
        }
    }
}