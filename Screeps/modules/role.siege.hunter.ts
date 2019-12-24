import * as map from './map';
import * as util from './util';

export function run(creep: Creep) {

    if (creep.room.name === creep.memory.assignedRoomName) {
        doBattle();
    } else {
        map.navigateToRoom(creep, creep.memory.assignedRoomName);
    }

    function doBattle() {

        var myDamage = 10 * creep.getActiveBodyparts(RANGED_ATTACK);

        var structures: Structure[] = creep.room.find(FIND_HOSTILE_STRUCTURES);
        var hostileCreeps: Creep[] = creep.room.find(FIND_HOSTILE_CREEPS);
        var nearbyHostileCreeps = (creep.pos.findInRange(hostileCreeps, 3) as Creep[]);

        attackSomething();
        pursueSomething();

        function attackSomething() {
            attack(findAttackTarget());
        }

        function findAttackTarget(): Structure | Creep {
            // TODO look at possibilities for mass attacks
            // prioritize towers and creeps that can attack or heal
            var target = findCreepAttackTarget();
            if (target) return target;
            // then prioritize whatever structure has the lowest health
            var nearbyStructure = _.sortBy(creep.pos.findInRange(structures, 3), o => o.hits)[0];
            if (nearbyStructure) return nearbyStructure;
        }

        function findCreepAttackTarget() {
            var valueData = nearbyHostileCreeps.map(o => {
                return { target: o, value: hostileCreepPriority(o) } as util.ValueData<Creep>;
            });
            return util.getBestValue(valueData);
        }

        function hostileCreepPriority(hostileCreep: Creep) {
            if (myDamage === 0 || hostileCreep.body.length === 0) return 0;

            var activeParts = util.filter(hostileCreep.body, o => o.hits > 0);

            var numberOfBodyPartsICanKill = Math.min(activeParts.length,
                (myDamage >= activeParts[0].hits ? 1 : 0) + Math.floor((myDamage - activeParts[0].hits) / 100));

            var numberOfImportantPartsICanKill = util.filter(activeParts.slice(0, numberOfBodyPartsICanKill), o =>
                o.type === ATTACK || o.type === RANGED_ATTACK || o.type === HEAL).length;

            var numberOfImportantPartsTotal = util.filter(hostileCreep.body, o =>
                o.type === ATTACK || o.type === RANGED_ATTACK || o.type === HEAL).length;

            var hitsToKill = Math.ceil(hostileCreep.hits / myDamage);

            return numberOfImportantPartsICanKill + (numberOfImportantPartsTotal / hitsToKill);
        }

        function pursueSomething() {
            // TODO if there is a melee attacker nearby, move away from it
            if (nearbyHostileCreeps.length) return;
            var targetCreep = creep.pos.findClosestByPath(hostileCreeps);
            if (pursue(targetCreep)) return;
            // all the important stuff has been destroyed. destroy whatever's left
            var structure: Structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: o => o.structureType != STRUCTURE_ROAD && o.structureType != STRUCTURE_CONTROLLER
            });
            if (structure && pursue(structure)) return;
        }
    }

    function attack(target: Creep | Structure) {
        if (!target) return false;
        return creep.rangedAttack(target) === OK;
    }

    function pursue(target: Creep | Structure) {
        if (!target) return false;
        return creep.moveTo(target) === OK;
    }
}