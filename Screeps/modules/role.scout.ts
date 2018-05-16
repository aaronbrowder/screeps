import * as map from './map';
import * as util from './util';
import * as rooms from './rooms';

export function run(creep: Creep) {

    const flag = rooms.getFlag(creep.memory.assignedRoomName);
    if (flag) {
        util.setMoveTargetFlag(creep, flag, 1);
    }
}