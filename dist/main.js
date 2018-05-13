"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const spawnManager = require("./manager.spawn");
const newSpawnManager = require("./manager.spawn.new");
const battleManager = require("./manager.battle");
const roleManager = require("./manager.roles");
const mobilization = require("./mobilization");
const structureLink = require("./structure.link");
const builderAssignment = require("./assignment.builder");
const transporterAssignment = require("./assignment.transporter");
exports.loop = () => {
    Memory.siegeMode = false;
    if (!Memory.rooms) {
        Memory.rooms = {};
    }
    mobilization.runDefenseSystems();
    // manager order matters!
    spawnManager.run();
    newSpawnManager.run();
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
};
//# sourceMappingURL=main.js.map