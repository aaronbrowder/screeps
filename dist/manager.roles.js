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
function benchmark(place) {
    //const item = benchmarkArray[place];
    //item.number = item.number + 1;
    //item.time = item.time + (Game.cpu.getUsed() - tempTime);
    //tempTime = Game.cpu.getUsed();
}
var tempTime;
const benchmarkArray = {};
benchmarkArray['elderly'] = { time: 0, number: 0 };
benchmarkArray['recycle'] = { time: 0, number: 0 };
benchmarkArray[enums.HARVESTER] = { time: 0, number: 0 };
benchmarkArray[enums.TRANSPORTER] = { time: 0, number: 0 };
benchmarkArray[enums.BUILDER] = { time: 0, number: 0 };
benchmarkArray[enums.HUB] = { time: 0, number: 0 };
benchmarkArray[enums.CLAIMER] = { time: 0, number: 0 };
benchmarkArray[enums.SCOUT] = { time: 0, number: 0 };
benchmarkArray[enums.COMBATANT] = { time: 0, number: 0 };
function run() {
    const terminals = _.filter(Game.structures, o => util.isTerminal(o));
    for (let i = 0; i < terminals.length; i++) {
        structureTerminal.run(terminals[i]);
    }
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        if (creep.spawning)
            continue;
        tempTime = Game.cpu.getUsed();
        const elderlyThreshold = creep.memory.role === enums.HUB ? 10 : 100;
        if (creep.ticksToLive < elderlyThreshold && !creep.memory.isElderly) {
            creep.memory.isElderly = true;
            util.refreshOrders(creep.memory.assignedRoomName);
        }
        benchmark('elderly');
        // don't send necessary defenders to recycle!
        if (creep.memory.markedForRecycle && creep.memory.subRole === enums.DEFENDER && util.getThreatLevel(creep.room) > 0) {
            creep.memory.markedForRecycle = false;
        }
        if (creep.memory.markedForRecycle) {
            if (util.goToRecycle(creep))
                continue;
        }
        benchmark('recycle');
        if (creep.memory.role === enums.HARVESTER) {
            if (roleWorker.run(creep))
                continue;
            roleHarvester.run(creep);
        }
        benchmark(enums.HARVESTER);
        if (creep.memory.role === enums.TRANSPORTER) {
            if (roleWorker.run(creep))
                continue;
            roleTransporter.run(creep);
        }
        benchmark(enums.TRANSPORTER);
        if (creep.memory.role === enums.BUILDER) {
            if (roleWorker.run(creep))
                continue;
            roleBuilder.run(creep);
        }
        benchmark(enums.BUILDER);
        if (creep.memory.role === enums.HUB) {
            roleHub.run(creep);
        }
        benchmark(enums.HUB);
        if (creep.memory.role === enums.CLAIMER) {
            if (roleWorker.run(creep))
                continue;
            roleClaimer.run(creep);
        }
        benchmark(enums.CLAIMER);
        if (creep.memory.role === enums.SCOUT) {
            roleScout.run(creep);
        }
        benchmark(enums.SCOUT);
        if (creep.memory.role === enums.COMBATANT) {
            roleCombatant.run(creep);
        }
        benchmark(enums.COMBATANT);
    }
    //for (let place in benchmarkArray) {
    //    const item = benchmarkArray[place];
    //    console.log('benchmark | ' + place + ' | ' + item.time + ' | ' + (item.time / item.number));
    //}
}
exports.run = run;
//# sourceMappingURL=manager.roles.js.map