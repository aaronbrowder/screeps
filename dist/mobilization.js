"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function runDefenseSystems() {
    for (const i in Game.structures) {
        const structure = Game.structures[i];
        if (structure.structureType == STRUCTURE_CONTROLLER) {
            runAlarmSystem(structure.room);
        }
    }
}
exports.runDefenseSystems = runDefenseSystems;
function runAlarmSystem(room) {
    if (!room.controller.safeMode && !!room.controller.safeModeAvailable && detectDangerousCreeps(room) && detectWallBreach(room)) {
        console.log('WALL BREACH!');
        room.controller.activateSafeMode();
    }
}
function detectDangerousCreeps(room) {
    return !!room.find(FIND_HOSTILE_CREEPS, { filter: o => o.body.some(p => p.type == ATTACK || p.type == RANGED_ATTACK) }).length;
}
function detectWallBreach(room) {
    const walls = room.find(FIND_STRUCTURES, {
        filter: function (structure) {
            return structure.structureType == STRUCTURE_WALL || structure.structureType == STRUCTURE_RAMPART;
        }
    });
    return walls.some(o => o.hits < 1000);
}
exports.detectWallBreach = detectWallBreach;
//# sourceMappingURL=mobilization.js.map