var map = require('map');
var util = require('util');

module.exports = {
    run: function(creep) {
        
        if (util.moveToMoveTarget(creep)) return;
        
        if (creep.room.name === creep.memory.assignedRoomName) {
            // if creep is low on health, it should retreat
            if (creep.hits < creep.hitsMax / 2) {
                retreat();
                return;
            }
            // if there is a tower nearby we can attack, attack that
            var nearbyTowers = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, 3, { filter: o => o.structureType == STRUCTURE_TOWER });
            if (nearbyTowers.length && attack(nearbyTowers[0])) return;
            // our primary goal is to kill the spawn
            var spawns = creep.room.find(FIND_HOSTILE_SPAWNS);
            if (spawns.length && attack(spawns[0])) return;
            // once the spawn is dead, we want to go after any towers
            var towers = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: o => o.structureType == STRUCTURE_TOWER });
            if (towers.length && attack(towers[0])) return;
            // either there is no spawn or there's something blocking the way. first try attacking creeps
            var targetCreep = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
            if (targetCreep && attack(targetCreep)) return;
            // no creeps to attack. there's probably walls blocking the way. attack the weakest one
            var walls = _.sortBy(creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: o => 
                (o.structureType == STRUCTURE_WALL || o.structureType == STRUCTURE_RAMPART)
            }), o => o.hits);
            for (var i in walls) {
                if (attack(walls[i])) return;
            }
            // all the important stuff has been destroyed. destroy whatever's left
            var structure = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, { filter: o => 
                o.structureType != STRUCTURE_ROAD && o.structureType != STRUCTURE_CONTROLLER
            });
            if (structure && attack(structure)) return;
        } else {
            var waitOutside = creep.hits < creep.hitsMax || creep.memory.wait;
            map.navigateToRoom(creep, creep.memory.assignedRoomName, waitOutside);
        }
        
        function retreat() {
            map.navigateToRoom(creep, creep.memory.homeRoomName);
        }
        
        function attack(target) {
            var result = creep.attack(target);
            if (result === OK) {
                return true;
            }
            if (result === ERR_NOT_IN_RANGE) {
                if (creep.moveTo(target) === OK) {
                    return true;
                }
            }
            return false;
        }
    }
};