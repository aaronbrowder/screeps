"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const spawnManager = require("./spawn");
const modes = require("./util.modes");
const battleManager = require("./manager.battle");
const roleManager = require("./manager.roles");
const mobilization = require("./mobilization");
const structureLink = require("./structure.link");
const structureTower = require("./structure.tower");
const builderAssignment = require("./assignment.builder");
const transporterAssignment = require("./assignment.transporter");
exports.loop = () => {
    if (!Memory.rooms) {
        Memory.rooms = {};
    }
    if (!Memory.raidWaves) {
        Memory.raidWaves = [];
    }
    if (!Memory.remoteTowers) {
        Memory.remoteTowers = [];
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
};
//# sourceMappingURL=main.js.map