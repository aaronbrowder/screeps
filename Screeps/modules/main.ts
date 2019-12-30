import * as spawnManager from './spawn';
import * as modes from './util.modes';
import * as battleManager from './manager.battle';
import * as roleManager from './manager.roles';
import * as mobilization from './mobilization';
import * as structureLink from './structure.link';
import * as structureTower from './structure.tower';
import * as builderAssignment from './assignment.builder';
import * as transporterAssignment from './assignment.transporter';

export const loop = () => {

    if (!Memory.rooms) {
        Memory.rooms = {};
    }
    if (!Memory.raidWaves) {
        Memory.raidWaves = [];
    }

    for (let roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (room && room.controller && room.controller.my) {
            modes.switchModes(room);
        }
    }

    mobilization.runDefenseSystems();
    // manager order matters!
    spawnManager.run();
    battleManager.run();
    roleManager.run();
    // assignment must happen after roles have been run
    builderAssignment.assignBuilders();
    transporterAssignment.assignTransporters();
    structureLink.runAll();
    structureTower.runAll();
    collectGarbage();

    function collectGarbage() {
        for (var i in Memory.creeps) {
            if (!Game.creeps[i]) {
                delete Memory.creeps[i];
            }
        }
        for (var i in Memory.flags) {
            if (!Game.flags[i]) {
                delete Memory.flags[i];
            }
        }
    }
}