import * as roleWorker from './role.worker';
import * as roleBuilder from './role.worker.builder';
import * as roleHarvester from './role.worker.harvester';
import * as roleTransporter from './role.worker.transporter';
import * as roleHub from './role.worker.hub';
import * as roleClaimer from './role.worker.claimer';
import * as roleScout from './role.scout';

import * as roleRavager from './role.combat.ravager';
import * as roleMercenary from './role.mercenary';
import * as roleCrusher from './role.siege.crusher';
import * as roleMedic from './role.siege.medic';
import * as roleHunter from './role.siege.hunter';

import * as structureTower from './structure.tower';
import * as structureTerminal from './structure.terminal';

import * as util from './util';

export function run() {

    const towers: Tower[] = _.filter(Game.structures, o => util.isTower(o));
    for (let i = 0; i < towers.length; i++) {
        structureTower.run(towers[i]);
    }

    const terminals: Terminal[] = _.filter(Game.structures, o => util.isTerminal(o));
    for (let i = 0; i < terminals.length; i++) {
        structureTerminal.run(terminals[i]);
    }

    for (var name in Game.creeps) {
        var creep = Game.creeps[name];

        if (creep.spawning) continue;

        // if the creep is dying, tell the spawn to run the spawn script on the next tick
        // LEGACY
        if (creep.ticksToLive <= 1) {
            util.refreshSpawn(creep.memory.homeRoomName);
        }

        const elderlyThreshold = creep.memory.role !== 'hub' ? 10 : 100;
        if (creep.ticksToLive < elderlyThreshold && !creep.memory.isElderly) {
            creep.memory.isElderly = true;
            util.refreshOrders(creep.memory.assignedRoomName);
        }

        if (creep.memory.markedForRecycle) {
            if (util.goToRecycle(creep)) continue;
        }

        if (creep.memory.role === 'harvester') {
            if (roleWorker.run(creep)) continue;
            roleHarvester.run(creep);
        }

        if (creep.memory.role === 'transporter') {
            if (roleWorker.run(creep)) continue;
            roleTransporter.run(creep);
        }

        if (creep.memory.role === 'builder') {
            if (roleWorker.run(creep)) continue;
            roleBuilder.run(creep);
        }

        if (creep.memory.role === 'hub') {
            roleHub.run(creep);
        }

        if (creep.memory.role === 'claimer') {
            if (roleWorker.run(creep)) continue;
            roleClaimer.run(creep);
        }

        if (creep.memory.role === 'scout') {
            roleScout.run(creep);
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