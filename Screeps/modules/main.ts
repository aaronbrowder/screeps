import * as spawnManager from './spawn';
import * as battleManager from './manager.battle';
import * as roleManager from './manager.roles';
import * as mobilization from './mobilization';
import * as structureLink from './structure.link';
import * as builderAssignment from './assignment.builder';
import * as transporterAssignment from './assignment.transporter';

export const loop = () => {

    Memory.siegeMode = false;

    if (!Memory.rooms) {
        Memory.rooms = {};
    }
    if (!Memory.raidWaves) {
        Memory.raidWaves = [];
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