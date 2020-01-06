"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const roleWorker = require("./role.worker");
const roleBuilder = require("./role.worker.builder");
const roleHarvester = require("./role.worker.harvester");
const roleTransporter = require("./role.worker.transporter");
const roleHub = require("./role.worker.hub");
const roleClaimer = require("./role.worker.claimer");
const roleScout = require("./role.scout");
const roleCombatant = require("./role.combatant");
const structureTerminal = require("./structure.terminal");
const util = require("./util");
const enums = require("./enums");
function run() {
    const terminals = _.filter(Game.structures, o => util.isTerminal(o));
    for (let i = 0; i < terminals.length; i++) {
        structureTerminal.run(terminals[i]);
    }
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        if (creep.spawning)
            continue;
        const elderlyThreshold = creep.memory.role === enums.HUB ? 10 : 100;
        if (creep.ticksToLive < elderlyThreshold && !creep.memory.isElderly) {
            creep.memory.isElderly = true;
            util.refreshOrders(creep.memory.assignedRoomName);
        }
        // don't send necessary defenders to recycle!
        if (creep.memory.markedForRecycle && creep.memory.subRole === enums.DEFENDER && util.getThreatLevel(creep.room) > 0) {
            creep.memory.markedForRecycle = false;
        }
        if (creep.memory.markedForRecycle) {
            if (util.goToRecycle(creep))
                continue;
        }
        if (creep.memory.role === enums.HARVESTER) {
            if (roleWorker.run(creep))
                continue;
            roleHarvester.run(creep);
        }
        if (creep.memory.role === enums.TRANSPORTER) {
            if (roleWorker.run(creep))
                continue;
            roleTransporter.run(creep);
        }
        if (creep.memory.role === enums.BUILDER) {
            if (roleWorker.run(creep))
                continue;
            roleBuilder.run(creep);
        }
        if (creep.memory.role === enums.HUB) {
            roleHub.run(creep);
        }
        if (creep.memory.role === enums.CLAIMER) {
            if (roleWorker.run(creep))
                continue;
            roleClaimer.run(creep);
        }
        if (creep.memory.role === enums.SCOUT) {
            roleScout.run(creep);
        }
        if (creep.memory.role === enums.COMBATANT) {
            roleCombatant.run(creep);
        }
    }
}
exports.run = run;
//# sourceMappingURL=manager.roles.js.map