import * as map from './map';
import * as rooms from './rooms';
import * as util from './util';
import * as cache from './cache';
import * as battleManager from './manager.battle';

export function run(creep: Creep) {

    const hasAttackPart = creep.getActiveBodyparts(ATTACK) > 0;
    const hasRangedAttackPart = creep.getActiveBodyparts(RANGED_ATTACK) > 0;
    const hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS);

    const wave = util.firstOrDefault(Memory.raidWaves, o => o.id === creep.memory.raidWaveId);

    if (checkForCombat()) return;
    if (checkForWaveMeetup(wave)) return;

    if (creep.room.name !== creep.memory.assignedRoomName) {
        map.navigateToRoom(creep, creep.memory.assignedRoomName);
        return;
    }

    if (wave && wave.targetStructureId && Game.getObjectById(wave.targetStructureId)) {
        attackTarget(Game.getObjectById(wave.targetStructureId));
    } else {
        if (rapeAndPillage()) return;
    }

    util.moveToMoveTarget(creep);

    function attackTarget(targetStructure: Structure) {
        const target = adjustTarget(targetStructure);
        const range = creep.pos.getRangeTo(target);
        if (range <= 3 && hasRangedAttackPart) {
            creep.rangedAttack(target);
        }
        if (range <= 1) {
            creep.attack(target);
        }
        if (creep.memory.moveTargetId !== target.id) {
            util.setMoveTarget(creep, target, 1, false);
        }
    }

    function adjustTarget(targetStructure: Structure): Structure | Creep {
        if (targetStructure.structureType === STRUCTURE_KEEPER_LAIR) {
            const key = '9c918b92-9c32-418d-9443-60fff329a3b3-' + creep.id + '-' + targetStructure.id;
            const expiresAfter = 23;
            var targetCreep = cache.get(key, expiresAfter, findNearbyCreep, false);
            if (!targetCreep) {
                targetCreep = cache.get(key, expiresAfter, findNearbyCreep, true);
            }
            if (targetCreep) {
                return targetCreep;
            }
        }
        return targetStructure;

        function findNearbyCreep(): Creep {
            return creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
                filter: o => {
                    return o.pos.inRangeTo(targetStructure, 10);
                }
            });
        }
    }

    function rapeAndPillage() {
        const directive = rooms.getRaidDirective(creep.memory.assignedRoomName);
        if (hostileCreeps.length && (!directive || directive.automateTargets)) {
            var targetCreep = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
            if (targetCreep) {
                attack(targetCreep);
                return true;
            }
        } else if (wave && directive && directive.autoDeclareVictory) {
            if (!creep.room.memory.isConquered) {
                battleManager.declareVictory(wave);
            }
            return true;
        }
        return false;
    }

    function checkForWaveMeetup(wave: RaidWave) {
        if (wave && !wave.ready) {
            const meetupFlag = rooms.getRaidWaveMeetupFlag(creep.memory.assignedRoomName);
            if (meetupFlag) {
                util.setMoveTargetFlag(creep, meetupFlag);
                return true;
            }
        }
        return false;
    }

    function checkForCombat() {
        // TODO need more sophisticated logic for determining whether to strafe or advance
        // TODO when strafing, avoid swamps and look more than one space away for an open area
        if (hostileCreeps.length) {
            var rangedCombatOpponents = util.filter(hostileCreeps, o =>
                o.getActiveBodyparts(RANGED_ATTACK) > o.getActiveBodyparts(ATTACK) && o.pos.inRangeTo(creep.pos, 3)
            );
            var meleeCombatOpponents = util.filter(hostileCreeps, o =>
                o.getActiveBodyparts(ATTACK) >= o.getActiveBodyparts(RANGED_ATTACK) && o.pos.inRangeTo(creep.pos, 1)
            );
            if (rangedCombatOpponents.length || meleeCombatOpponents.length) {
                util.setMoveTarget(creep, null);
                engageInCombat(rangedCombatOpponents, meleeCombatOpponents);
                return true;
            }
        }
        return false;
    }

    function engageInCombat(rangedOpponents: Creep[], meleeOpponents: Creep[]) {
        if (meleeOpponents.length && hasRangedAttackPart) {
            strafe(null, meleeOpponents);
        }
        else if (rangedOpponents.length && hasAttackPart) {
            var target = creep.pos.findClosestByRange<Creep>(rangedOpponents);
            if (!creep.pos.inRangeTo(target.pos, 1)) {
                creep.moveTo(target, { reusePath: 0 });
            }
        }
        if (hasAttackPart) {
            var attackResult;
            var adjacentRangedOpponents = creep.pos.findInRange<Creep>(rangedOpponents, 1);
            if (adjacentRangedOpponents.length) {
                attackResult = creep.attack(adjacentRangedOpponents[0]);
            }
            if (attackResult !== OK) {
                var adjacentMeleeOpponents = creep.pos.findInRange<Creep>(meleeOpponents, 1);
                var target = adjacentMeleeOpponents[0];
                if (target && target.getActiveBodyparts(ATTACK) < creep.getActiveBodyparts(ATTACK)) {
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
                var target = creep.pos.findClosestByRange<Creep>(allOpponents);
                creep.rangedAttack(target);
            }
        }
    }

    function strafe(rangedOpponents: Creep[], meleeOpponents: Creep[]) {
        var goals = [];
        if (rangedOpponents && rangedOpponents.length) {
            goals = goals.concat(rangedOpponents.map(o => { return { pos: o.pos, range: 3 } }));
        }
        if (meleeOpponents && meleeOpponents.length) {
            goals = goals.concat(meleeOpponents.map(o => { return { pos: o.pos, range: 1 } }));
        }
        var result = PathFinder.search(creep.pos, goals, { flee: true });
        var pos = result.path[0];
        creep.move(creep.pos.getDirectionTo(pos));
    }

    function attack(target: Creep | Structure) {
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
}