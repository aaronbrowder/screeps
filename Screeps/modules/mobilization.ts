import * as util from './util';

export function runDefenseSystems() {
    for (const i in Game.structures) {
        const structure = Game.structures[i];
        if (structure.structureType == STRUCTURE_CONTROLLER) {
            runAlarmSystem(structure.room);
        }
    }
}

function runAlarmSystem(room: Room) {
    const hostileCreeps = room.find(FIND_HOSTILE_CREEPS, {
        filter: o => o.body.some(p => p.type == ATTACK || p.type == RANGED_ATTACK)
    });
    const walls = room.find(FIND_STRUCTURES, {
        filter: o => util.isWall(o) || util.isRampart(o)
    });
    if (!room.controller.safeMode && hostileCreeps.length > 0 && (!walls.length || walls.some(o => o.hits < 1000))) {
        const attacker = hostileCreeps[0].owner.username;
        var message = 'Wall breach in room ' + room.name + '. Attacking player is ' + attacker + '.';
        if (!!room.controller.safeModeAvailable) {
            room.controller.activateSafeMode();
            message += ' Activating safe mode.';
            Game.notify(message);
        } else {
            message += ' No safe mode is available.';
            Game.notify(message);
        }
    }
}
