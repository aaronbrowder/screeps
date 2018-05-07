"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const roleWorker = require("./role.worker");
const roleBuilder = require("./role.worker.builder");
const roleHarvester = require("./role.worker.harvester");
const roleTransporter = require("./role.worker.transporter");
const roleHub = require("./role.worker.hub");
const roleClaimer = require("./role.worker.claimer");
const roleRavager = require("./role.combat.ravager");
const roleMercenary = require("./role.mercenary");
const roleCrusher = require("./role.siege.crusher");
const roleMedic = require("./role.siege.medic");
const roleHunter = require("./role.siege.hunter");
const structureTower = require("./structure.tower");
const util = require("./util");
function run() {
    var towers = _.filter(Game.structures, function (structure) { return structure.structureType == STRUCTURE_TOWER; });
    for (var i = 0; i < towers.length; i++) {
        structureTower.run(towers[i]);
    }
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        if (creep.spawning)
            continue;
        // if the creep is dying, tell the spawn to run the spawn script on the next tick
        if (creep.ticksToLive <= 1) {
            util.refreshSpawn(creep.memory.homeRoomName);
        }
        if (creep.memory.markedForRecycle) {
            if (util.goToRecycle(creep))
                continue;
        }
        if (creep.memory.role === 'harvester') {
            if (roleWorker.run(creep))
                continue;
            roleHarvester.run(creep);
        }
        if (creep.memory.role === 'transporter') {
            if (roleWorker.run(creep))
                continue;
            roleTransporter.run(creep);
        }
        if (creep.memory.role === 'builder') {
            if (roleWorker.run(creep))
                continue;
            roleBuilder.run(creep);
        }
        if (creep.memory.role === 'hub') {
            roleHub.run(creep);
        }
        if (creep.memory.role === 'claimer') {
            if (roleWorker.run(creep))
                continue;
            roleClaimer.run(creep);
        }
        if (creep.memory.role === 'ravager') {
            roleRavager.run(creep);
        }
        if (creep.memory.role === 'meleeMercenary' || creep.memory.role === 'rangedMercenary') {
            roleMercenary.run(creep);
        }
        if (creep.memory.role === 'crusher') {
            roleCrusher.run(creep);
        }
        if (creep.memory.role === 'medic') {
            roleMedic.run(creep);
        }
        if (creep.memory.role === 'hunter') {
            roleHunter.run(creep);
        }
    }
}
exports.run = run;
//# sourceMappingURL=manager.roles.js.map