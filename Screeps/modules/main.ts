import * as spawnManager from './spawn';
import * as modes from './util.modes';
import * as benchmarking from './util.benchmarking';
import * as battleManager from './manager.battle';
import * as roleManager from './manager.roles';
import * as mobilization from './mobilization';
import * as structureLink from './structure.link';
import * as structureTower from './structure.tower';
import * as builderAssignment from './assignment.builder';
import * as transporterAssignment from './assignment.transporter';
import { benchmark } from './util.benchmarking';

export const loop = () => {

    if (!Memory.rooms) {
        Memory.rooms = {};
    }
    if (!Memory.raidWaves) {
        Memory.raidWaves = [];
    }
    if (!Memory.remoteTowers) {
        Memory.remoteTowers = [];
    }

    //benchmarking.initializeBenchmarking();

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

    //benchmarking.calculateBenchmarks();

    function collectGarbage() {
        for (let i in Memory.creeps) {
            if (!Game.creeps[i]) {
                delete Memory.creeps[i];
            }
        }
        for (let i in Memory.flags) {
            if (!Game.flags[i]) {
                delete Memory.flags[i];
            }
        }
    }
}