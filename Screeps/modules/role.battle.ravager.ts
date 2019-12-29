import * as map from './map';
import * as rooms from './rooms';
import * as util from './util';
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

    const directive = rooms.getRaidDirective(creep.memory.assignedRoomName);
    if (!directive) {
        console.warn(creep.name + ' has no raid directive, so it will do nothing.');
        return;
    }

    if (wave && wave.targetStructureId && Game.getObjectById(wave.targetStructureId)) {
        const targetStructure = Game.getObjectById(wave.targetStructureId);
        const range = creep.pos.getRangeTo(targetStructure);
        if (range <= 3 && hasRangedAttackPart) {
            creep.rangedAttack(targetStructure);
        }
        if (range <= 1) {
            creep.attack(targetStructure);
        }
        if (creep.memory.moveTargetId !== targetStructure.id) {
            util.setMoveTarget(creep, targetStructure, 1, false);
        }
    } else {
        // no assignments. just try to kill hostile creeps
        if (directive.automateTargets && hostileCreeps.length) {
            var targetCreep = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
            if (targetCreep) {
                attack(targetCreep);
            }
        } else if (wave && directive.autoDeclareVictory) {
            if (!creep.room.memory.isConquered) {
                battleManager.declareVictory(wave);
            }
            return;
        }
    }

    util.moveToMoveTarget(creep);

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
        if (hostileCreeps.length) {
            var rangedCombatOpponents = util.filter(hostileCreeps, o =>
                o.getActiveBodyparts(RANGED_ATTACK) > 0 && o.pos.inRangeTo(creep.pos, 3)
            );
            var meleeCombatOpponents = util.filter(hostileCreeps, o =>
                o.getActiveBodyparts(ATTACK) > 0 && o.pos.inRangeTo(creep.pos, 1)
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
        if (creep.hits < creep.hitsMax / 2) {
            flee(rangedOpponents, meleeOpponents);
        }
        else if (meleeOpponents.length && hasRangedAttackPart) {
            flee(null, meleeOpponents);
        }
        else if (rangedOpponents.length && hasAttackPart) {
            var target = creep.pos.findClosestByRange<Creep>(rangedOpponents);
            if (!creep.pos.inRangeTo(target.pos, 1)) {
                creep.moveTo(target);
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

    function flee(rangedOpponents: Creep[], meleeOpponents: Creep[]) {
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