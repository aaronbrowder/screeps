"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const roleWorker = require("./role.worker");
const roleBuilder = require("./role.worker.builder");
const roleHarvester = require("./role.worker.harvester");
const roleTransporter = require("./role.worker.transporter");
const roleHub = require("./role.worker.hub");
const roleClaimer = require("./role.worker.claimer");
const roleScout = require("./role.scout");
const roleRavager = require("./role.battle.ravager");
const structureTower = require("./structure.tower");
const structureTerminal = require("./structure.terminal");
const util = require("./util");
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
benchmarkArray['harvester'] = { time: 0, number: 0 };
benchmarkArray['transporter'] = { time: 0, number: 0 };
benchmarkArray['builder'] = { time: 0, number: 0 };
benchmarkArray['hub'] = { time: 0, number: 0 };
benchmarkArray['claimer'] = { time: 0, number: 0 };
benchmarkArray['scout'] = { time: 0, number: 0 };
benchmarkArray['ravager'] = { time: 0, number: 0 };
function run() {
    const towers = _.filter(Game.structures, o => util.isTower(o));
    for (let i = 0; i < towers.length; i++) {
        structureTower.run(towers[i]);
    }
    const terminals = _.filter(Game.structures, o => util.isTerminal(o));
    for (let i = 0; i < terminals.length; i++) {
        structureTerminal.run(terminals[i]);
    }
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        if (creep.spawning)
            continue;
        tempTime = Game.cpu.getUsed();
        const elderlyThreshold = creep.memory.role === 'hub' ? 10 : 100;
        if (creep.ticksToLive < elderlyThreshold && !creep.memory.isElderly) {
            creep.memory.isElderly = true;
            util.refreshOrders(creep.memory.assignedRoomName);
        }
        benchmark('elderly');
        if (creep.memory.markedForRecycle) {
            if (util.goToRecycle(creep))
                continue;
        }
        benchmark('recycle');
        if (creep.memory.role === 'harvester') {
            if (roleWorker.run(creep))
                continue;
            roleHarvester.run(creep);
        }
        benchmark('harvester');
        if (creep.memory.role === 'transporter') {
            if (roleWorker.run(creep))
                continue;
            roleTransporter.run(creep);
        }
        benchmark('transporter');
        if (creep.memory.role === 'builder') {
            if (roleWorker.run(creep))
                continue;
            roleBuilder.run(creep);
        }
        benchmark('builder');
        if (creep.memory.role === 'hub') {
            roleHub.run(creep);
        }
        benchmark('hub');
        if (creep.memory.role === 'claimer') {
            if (roleWorker.run(creep))
                continue;
            roleClaimer.run(creep);
        }
        benchmark('claimer');
        if (creep.memory.role === 'scout') {
            roleScout.run(creep);
        }
        benchmark('scout');
        if (creep.memory.role === 'ravager') {
            roleRavager.run(creep);
        }
        benchmark('ravager');
    }
    //for (let place in benchmarkArray) {
    //    const item = benchmarkArray[place];
    //    console.log('benchmark | ' + place + ' | ' + item.time + ' | ' + (item.time / item.number));
    //}
}
exports.run = run;
//# sourceMappingURL=manager.roles.js.map