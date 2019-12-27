import * as map from './map';
import * as rooms from './rooms';
import * as util from './util';

/* OVERVIEW
 * There are three types of battle environments:
 * 1. Enemy-controlled room. We want to pierce enemy defenses and destroy key structures.
 * 2. Ally-controlled room. We want to destroy invading creeps.
 * 3. Neutral room. We want to engage enemy creeps in the field.
 * A Ravager is spawned with one of these specific purposes in mind. It is assigned a target room upon spawning.
 * A Ravager is a general-purpose combat unit that can perform both melee and ranged attacks. It can pursue
 * and engage in combat with enemy creeps, as well as lay seige to structures.
 * A Ravager does not operate alone but acts as part of a combat unit. Ravagers in a unit follow their leader.
 * They can follow independent paths if there are nearby enemy creeps to attack, but they will abandon combat
 * and return to their leader if the leader gets too far away.
*/

/* ENEMY-CONTROLLED ROOM
 * The primary objective is to destroy all spawns. However, if the spawn is surrounded by walls, and there are
 * other key structures that are not protected, it may be better to go for the other key structures.
 * We can also potentially shut off towers by disrupting enemy supply lines.
 * The priority value of an enemy structure can be calculated as the intrinsic value of that structure
 * divided by the amount of time it will take to destroy it (including the time required to travel to it,
 * and the time required to destroy any walls blocking the way).
 * If the structure with the highest priority value is behind walls, we must calculate a path ignoring
 * walls and then choose the first wall we encounter to be our temporary target.
 * Once we have decided on a target, all Ravagers in the unit will begin attacking that target.
 * This may involve localized decision making if there are enemy creeps near the target.
 * Ravagers with low melee damage (or higher ranged damage than melee damage) should move out of the
 * way so that Ravagers with higher melee damage can be adjacent to the target.
 * If we cannot reach the target structure at a distance of 1 but we can reach it at a distance of
 * 2 or 3, it may sometimes be better to go ahead and ranged attack it rather than breaking obstacles.
*/

export function run(creep: Creep) {

    const hasAttackPart = creep.getActiveBodyparts(ATTACK) > 0;
    const hasRangedAttackPart = creep.getActiveBodyparts(RANGED_ATTACK) > 0;
    const hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS);

    const wave = util.firstOrDefault(Memory.raidWaves, o => o.id === creep.memory.raidWaveId);

    const controller = creep.room.controller;
    const isEnemyRoom = controller && !controller.my && controller.owner;

    if (checkForCombat()) return;
    if (checkForWaveMeetup(wave)) return;

    // if creep is not in its assigned room, navigate there
    if (creep.room.name !== creep.memory.assignedRoomName) {
        map.navigateToRoom(creep, creep.memory.assignedRoomName);
        return;
    }

    if (wave && !Game.getObjectById(wave.leaderId)) {
        // first come, first serve!
        wave.leaderId = creep.id;
    }

    if (isEnemyRoom && isWaveLeader()) {
        wave.targetStructureId = findDirectiveTargetStructureId();
    }

    if (util.moveToMoveTarget(creep)) return;

    if (!isEnemyRoom) {
        // this room is mine or neutral. just try to kill hostile creeps.
        // TODO we should spawn waves for defense rather than marching in one at a time
        // TODO if this is my room, we should try to hide in ramparts
        var targetCreep = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
        if (targetCreep) {
            attack(targetCreep);
        }
    }

    function isWaveLeader() {
        return wave && wave.leaderId === creep.id;
    }

    function findDirectiveTargetStructureId(): Id<Structure> {
        const raidDirective = rooms.getRaidDirective(creep.room.name);
        if (!raidDirective || !raidDirective.targetStructureIds.length) return null;
        const firstTarget = raidDirective.targetStructureIds[0];
        if (!Game.getObjectById(firstTarget)) {
            // The target no longer exists. Let's remove it from the list and start the function over.
            raidDirective.targetStructureIds.shift();
            return findDirectiveTargetStructureId();
        }

        return null;
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