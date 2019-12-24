import * as map from './map';
import * as util from './util';

export function run(creep: Creep) {

    // FEATURE IDEAS
    // - create "decoy" class which has one attack part and a lot of tough parts, to confuse enemy algorithms
    // - if crusher is damaged, it may be pursued by a medic. we don't want to run away from the medic.
    // - when up against enemy melee attackers, crushers may want to form a wall to protect medics & hunters.

    if (creep.room.name === creep.memory.assignedRoomName) {
        // if creep is low on health, it should retreat
        // TODO save retreat path in memory, so we can continue to attack while we are fleeing
        if (creep.hits < creep.hitsMax / 2) {
            retreat();
            return;
        }
        doBattle();
    } else {
        var waitOutside = creep.hits < creep.hitsMax || creep.memory.wait;
        map.navigateToRoom(creep, creep.memory.assignedRoomName, waitOutside);
    }

    function doBattle() {

        var myDamage = 30 * creep.getActiveBodyparts(ATTACK);

        var structures = creep.room.find(FIND_HOSTILE_STRUCTURES);
        var towers = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: o => o.structureType == STRUCTURE_TOWER });
        var hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
        var spawns = creep.room.find(FIND_HOSTILE_SPAWNS);

        // A crusher can only melee attack and move. It can do both in one tick. It will pursue its desired
        // target until it reaches that target or until something gets in the way that prevents it from moving
        // forward. Along the way, it will attack whatever is within attack range (1) based on what is the
        // biggest threat at the time. However, it will not become distracted; its move and attack procedures
        // are independent of one another.
        attackSomething();
        pursueSomething();

        function attackSomething() {
            // This procedure looks at targets in attack range (1) and decides which one to attack.
            // It does not cause the crusher to pursue things that are not in attack range.
            attack(findAttackTarget());
        }

        function findAttackTarget(): Structure | Creep {
            // prioritize towers and creeps that can attack or heal
            var target = findTowerOrCreepAttackTarget();
            if (target) return target;
            // then prioritize spawns
            var nearbySpawn = creep.pos.findInRange(spawns, 1)[0] as StructureSpawn;
            if (nearbySpawn) return nearbySpawn;
            // then prioritize whatever structure has the lowest health
            var nearbyStructure = _.sortBy(creep.pos.findInRange(structures, 1), o => o.hits)[0];
            if (nearbyStructure) return nearbyStructure;
            // finally attack whatever creep has the lowest health
            return _.sortBy(creep.pos.findInRange(hostileCreeps, 1), o => o.hits)[0];
        }

        function findTowerOrCreepAttackTarget() {
            var nearbyTowers = (creep.pos.findInRange(towers, 1) as StructureTower[]).map(o => {
                return { target: o, value: towerValue(o) } as util.ValueData<StructureTower | Creep>;
            });
            var nearbyHostileCreeps = (creep.pos.findInRange(hostileCreeps, 1) as Creep[]).map(o => {
                return { target: o, value: hostileCreepValue(o) } as util.ValueData<StructureTower | Creep>;
            });
            var targets = util.filter(nearbyTowers.concat(nearbyHostileCreeps), o => o.value > 0);
            return util.getBestValue(targets);
        }

        function towerValue(tower: StructureTower) {
            if (myDamage === 0 || tower.hits === 0) return 0;
            var hitsToKill = tower.hits / myDamage;
            var theirDamage = 600;
            var priority = theirDamage / hitsToKill;
            // reduce priority if tower is out of energy
            if (tower.energy < 10) {
                return priority / Math.pow(hitsToKill, 2);
            }
            return priority;
        }

        function hostileCreepValue(hostileCreep: Creep) {
            if (myDamage === 0 || hostileCreep.body.length === 0) return 0;

            var bodyParts = util.filter(hostileCreep.body, o => o.hits > 0);

            var numberOfBodyPartsICanKill = Math.min(bodyParts.length,
                (myDamage >= bodyParts[0].hits ? 1 : 0) + Math.floor((myDamage - bodyParts[0].hits) / 100));

            var numberOfImportantPartsICanKill = util.filter(bodyParts.slice(0, numberOfBodyPartsICanKill), o =>
                o.type === ATTACK || o.type === RANGED_ATTACK || o.type === HEAL).length;

            var numberOfImportantPartsTotal = util.filter(bodyParts, o =>
                o.type === ATTACK || o.type === RANGED_ATTACK || o.type === HEAL).length;

            var hitsToKill = 100 * bodyParts.length / myDamage;

            // We average the priority of killing important parts with the priority of an overall kill.
            // This grants higher priority to targets whose attack power we can whittle down gradually,
            // vs. targets which we can only affect the HP (such as towers).
            // for example, hostileCreepBody = [TOUGH, TOUGH, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE]
            // if myDamage = 100:
            //    numberOfImportantPartsICanKill = 0
            //    numberOfImportantPartsTotal = 3
            //    hitsToKill = 8
            //    priority = 5.6
            // if myDamage = 300:
            //    numberOfImportantPartsICanKill = 1
            //    numberOfImportantPartsTotal = 3
            //    hitsToKill = 3
            //    priority = 30
            // if myDamage = 1000:
            //    numberOfImportantPartsICanKill = 3
            //    numberOfImportantPartsTotal = 3
            //    hitsToKill = 1
            //    priority = 90
            return 30 * (numberOfImportantPartsICanKill + (numberOfImportantPartsTotal / hitsToKill)) / 2;
        }

        function pursueSomething() {
            // if we are the leader, do nothing
            // if we are not the leader, follow the leader
            // if we are near the leader's target, go towards the target
            if (creep.memory.isLeader) return;

            // prioritize towers within 3 spaces
            var nearbyTowers = creep.pos.findInRange(towers, 3);
            if (pursue(nearbyTowers[0])) return;
            // then prioritize spawns
            if (pursue(spawns[0])) return;
            // then prioritize towers anywhere
            if (pursue(towers[0])) return;
            // either there is no spawn or there's something blocking the way. first try attacking creeps
            var targetCreep = creep.pos.findClosestByPath(hostileCreeps);
            if (pursue(targetCreep)) return;
            // no creeps to attack. there's probably walls blocking the way. attack the weakest one
            var walls = _.sortBy(creep.room.find(FIND_STRUCTURES, {
                filter: o =>
                    (o.structureType == STRUCTURE_WALL || o.structureType == STRUCTURE_RAMPART)
            }), o => o.hits);
            for (var i in walls) {
                if (pursue(walls[i])) return;
            }
            // all the important stuff has been destroyed. destroy whatever's left
            var structure: Structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: o =>
                    o.structureType != STRUCTURE_ROAD && o.structureType != STRUCTURE_CONTROLLER
            });
            if (structure && pursue(structure)) return;
        }
    }

    function retreat() {
        map.navigateToRoom(creep, creep.memory.homeRoomName);
    }

    function attack(target: Creep | Structure) {
        if (!target) return false;
        return creep.attack(target) === OK;
    }

    function pursue(target: Creep | Structure) {
        if (!target) return false;
        return creep.moveTo(target) === OK;
    }
}