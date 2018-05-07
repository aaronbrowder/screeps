var roleWorker = require('role.worker');
var roleBuilder = require('role.worker.builder');
var roleHarvester = require('role.worker.harvester');
var roleTransporter = require('role.worker.transporter');
var roleClaimer = require('role.worker.claimer');

var roleRavager = require('role.combat.ravager');
var roleMercenary = require('role.mercenary');
var roleBatteringRam = require('role.siege.batteringRam');
var roleMedic = require('role.siege.medic');
var roleCavalier = require('role.siege.cavalier');

var structureTower = require('structure.tower');
var util = require('util');

module.exports = {
    run: function() {
        
        var towers = _.filter(Game.structures, function(structure) { return structure.structureType == STRUCTURE_TOWER; });
        for (var i = 0; i < towers.length; i++) {
            structureTower.run(towers[i]);
        }
        
        for (var name in Game.creeps) {
            var creep = Game.creeps[name];
            
            if (creep.spawning) continue;
            
            // if the creep is dying, tell the spawn to run the spawn script on the next tick
            if (creep.ticksToLive <= 1) {
                util.refreshSpawn(creep.memory.homeRoomName);
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
            
            if (creep.memory.role === 'claimer') {
                if (roleWorker.run(creep)) continue;
                roleClaimer.run(creep);
            }
            
            if (creep.memory.role === 'ravager') {
                roleRavager.run(creep);
            }
            
            if (creep.memory.role === 'meleeMercenary' || creep.memory.role === 'rangedMercenary') {
                roleMercenary.run(creep);
            }
            
            if (creep.memory.role === 'batteringRam') {
                roleBatteringRam.run(creep);
            }
            
            if (creep.memory.role === 'medic') {
                roleMedic.run(creep);
            }
            
            if (creep.memory.role === 'cavalier') {
                roleCavalier.run(creep);
            }
        }
    }
};