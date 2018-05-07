var map = require('map');
var util = require('util');

module.exports = {
    run: function(creep) {
        
        var hasAttackPart = hasBodyPart(creep, ATTACK);
        var hasRangedAttackPart = hasBodyPart(creep, RANGED_ATTACK);
        
        var hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
        if (hostileCreeps.length) {
            var rangedCombatOpponents = _.filter(hostileCreeps, o =>
                hasBodyPart(o, RANGED_ATTACK) && o.pos.inRangeTo(creep.pos, 3)
            );
            var meleeCombatOpponents = _.filter(hostileCreeps, o =>
                hasBodyPart(o, ATTACK) && o.pos.inRangeTo(creep.pos, 1)
            );
            if (rangedCombatOpponents.length || meleeCombatOpponents.length) {
                util.setMoveTarget(creep, null);
                engageInCombat(rangedCombatOpponents, meleeCombatOpponents);
                return;
            }
        }
        
        if (util.moveToMoveTarget(creep)) return;
        
        // if creep is low on health, it should retreat
        // TODO make the creep take shelter behind walls
        if (creep.room.name !== creep.memory.homeRoomName && creep.hits < creep.hitsMax / 2) {
            map.navigateToRoom(creep, creep.memory.homeRoomName);
            return;
        }
        
        // if creep is not in its assigned room, navigate there
        if (creep.room.name !== creep.memory.assignedRoomName) {
            var waitOutside = !creep.memory.charge && (creep.hits < creep.hitsMax || creep.memory.wait);
            map.navigateToRoom(creep, creep.memory.assignedRoomName, waitOutside);
            return;
        }
        
        if (creep.room.controller && !creep.room.controller.my && creep.room.controller.owner) {
            // this room belongs to an enemy. try to destroy all the structures and creeps.
            
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
            
            // there's nothing left
            creep.memory.markedForRecycle = true;
        }
        else {
            // this room is mine or neutral. just try to kill hostile creeps.
            var targetCreep = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
            if (!targetCreep) {
                // no hostile creeps. we don't need the ravager anymore
                creep.memory.markedForRecycle = true;
            }
            attack(targetCreep);
        }
        
        function engageInCombat(rangedOpponents, meleeOpponents) {
            if (creep.hits < creep.hitsMax / 2) {
                flee(rangedOpponents, meleeOpponents);
            }
            else if (meleeOpponents.length && hasRangedAttackPart) {
                flee(null, meleeOpponents);
            }
            else if (rangedOpponents.length && hasAttackPart) {
                var target = creep.pos.findClosestByRange(rangedOpponents);
                if (!creep.pos.inRangeTo(target.pos, 1)) {
                    creep.moveTo(target);
                }
            }
            if (hasAttackPart) {
                var attackResult;
                var adjacentRangedOpponents = creep.pos.findInRange(rangedOpponents, 1);
                if (adjacentRangedOpponents.length) {
                    attackResult = creep.attack(adjacentRangedOpponents[0]);
                }
                if (attackResult !== OK) {
                    var adjacentMeleeOpponents = creep.pos.findInRange(meleeOpponents, 1);
                    var target = adjacentMeleeOpponents[0];
                    if (target && countBodyParts(target, ATTACK) < countBodyParts(creep, ATTACK)) {
                        creep.attack(target);
                    }
                }
            }
            if (hasRangedAttackPart) {
                var allOpponents = rangedOpponents.concat(meleeOpponents);
                var adjacentOpponents = creep.pos.findInRange(allOpponents, 1);
                var semiAdjacentOpponents = creep.pos.findInRange(allOpponents, 2);
                var massAttackValue = (adjacentOpponents.length * 6) + (semiAdjacentOpponents.length * 3) + allOpponents.length;
                if (massAttackValue > 10) {
                    creep.rangedMassAttack();
                } else {
                    var target = creep.pos.findClosestByRange(allOpponents);
                    creep.rangedAttack(target);
                }
            }
        }
        
        function flee(rangedOpponents, meleeOpponents) {
            var goals = [];
            if (rangedOpponents && rangedOpponents.length) {
                goals = goals.concat(rangedOpponents.map(o => { return { pos: o.pos, range: 3 }}));
            }
            if (meleeOpponents && meleeOpponents.length) {
                goals = goals.concat(meleeOpponents.map(o => { return { pos: o.pos, range: 1 }}));
            }
            var result = PathFinder.search(creep.pos, goals, { flee: true });
            var pos = result.path[0];
            creep.move(creep.pos.getDirectionTo(pos));
        }
        
        function attack(target) {
            var attackResult;
            var success = false;
            var hasMoved = false;
            if (hasAttackPart) {
                attackResult = creep.attack(target);
                if (attackResult === OK) success = true;
                if (attackResult === ERR_NOT_IN_RANGE) { 
                    if (moveTo(target)) {
                        success = true;
                        hasMoved = true;
                    }
                }
            }
            if (hasRangedAttackPart) {
                attackResult = creep.rangedAttack(target);
                if (attackResult === OK) success = true;
                if (attackResult === ERR_NOT_IN_RANGE && !hasMoved) { 
                    if (moveTo(target)) {
                        success = true;
                        hasMoved = true;
                    }
                }
            }
            return success;
        }
        
        function moveTo(target) {
            if (creep.moveTo(target) === OK) {
                // if target is a structure, it won't move, so we can just navigate to it without recalculating the decision every tick
                if (target.structureType) {
                    var desiredDistance = hasRangedAttackPart ? 3 : 1;
                    if (!target.pos.inRangeTo(creep.pos, desiredDistance)) {
                        util.setMoveTarget(creep, target, desiredDistance);
                    }
                }
                return true;
            }
            return false;
        }
        
        function hasBodyPart(c, type) {
            return !!countBodyParts(c, type);
        }
        
        function countBodyParts(c, type) {
            return _.filter(c.body, o => o.type === type && o.hits > 0).length;
        }
    }
};