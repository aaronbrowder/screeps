import * as util from './util';

function attackSomething(creep: Creep) {
    // This procedure looks at targets in attack range and decides which one to attack.
    // It does not cause the creep to pursue things that are not in attack range.

    const myMeleeDamage = ATTACK_POWER * creep.getActiveBodyparts(ATTACK);
    const myRangedDamage = RANGED_ATTACK_POWER * creep.getActiveBodyparts(RANGED_ATTACK);

    if (myMeleeDamage > 0) {
        const target = findAttackTarget(myMeleeDamage, true);
        if (target) {
            creep.attack(target);
        }
    }
    // if the necessary parts are present, we can melee attack and ranged attack in the same tick
    if (myRangedDamage > 0) {
        const target = findAttackTarget(myRangedDamage, false);
        if (target) {
            // TODO decide whether to do a mass attack or a regular ranged attack
            creep.rangedAttack(target);
        }
    }

    function findAttackTarget(myDamage: number, isMelee: boolean): Creep | Structure {
        const range = isMelee ? 1 : 3;
        // prioritize towers, spawns, storage, and creeps that can attack or heal
        const target = findPriorityAttackTarget(myDamage, range, isMelee);
        if (target) return target;
        // then attack whichever wall has the lowest health
        const nearbyStructures = creep.pos.findInRange<Structure>(FIND_HOSTILE_STRUCTURES, range);
        const nearbyWall = util.sortBy(util.filter(nearbyStructures, o => util.isRampart(o) || util.isWall(o)), o => o.hits)[0];
        if (nearbyWall) return nearbyWall;
        // then attack whichever worker creep has the lowest health
        const nearbyWorker = util.sortBy(creep.pos.findInRange<Creep>(FIND_HOSTILE_CREEPS, range), o => o.hits)[0];
        if (nearbyWorker) return nearbyWorker;
        // finally attack whichever structure has the lowest health
        const nearbyStructure = util.sortBy(nearbyStructures, o => o.hits)[0];
        return nearbyStructure;
    }

    function findPriorityAttackTarget(myDamage: number, range: number, isMelee: boolean) {

        const valueData = findTowers(myDamage, range)
            .concat(findSpawns(myDamage, range))
            .concat(findStorage(myDamage, range))
            .concat(findHostileCreeps(myDamage, range, isMelee));

        return util.getBestValue(util.filter(valueData, o => o.value > 0));
    }

    function findTowers(myDamage: number, range: number): Array<util.ValueData<Creep | Structure>> {
        return creep.room.find<Tower>(FIND_HOSTILE_STRUCTURES, {
            filter: o => util.isTower(o) && o.pos.inRangeTo(creep, range)
        }).map(o => {
            return { target: o, value: towerValue(o, myDamage) };
        });
    }

    function findSpawns(myDamage: number, range: number): Array<util.ValueData<Creep | Structure>> {
        return creep.room.find<Spawn>(FIND_HOSTILE_SPAWNS, {
            filter: (o: Spawn) => o.pos.inRangeTo(creep, range)
        }).map(o => {
            return { target: o, value: spawnValue(o, myDamage) };
        });
    }

    function findStorage(myDamage: number, range: number): Array<util.ValueData<Creep | Structure>> {
        return creep.room.find<Storage>(FIND_HOSTILE_STRUCTURES, {
            filter: o => util.isStorage(o) && o.pos.inRangeTo(creep, range)
        }).map(o => {
            return { target: o, value: storageValue(o, myDamage) };
        });
    }

    function findHostileCreeps(myDamage: number, range: number, isMelee: boolean): Array<util.ValueData<Creep | Structure>> {
        return creep.room.find<Creep>(FIND_HOSTILE_CREEPS, {
            filter: o => o.pos.inRangeTo(creep, range)
        }).map(o => {
            return { target: o, value: hostileCreepValue(o, myDamage, isMelee) };
        });
    }

    function towerValue(tower: Tower, myDamage: number) {
        const hitsToKill = getHitsToKill(tower, myDamage);
        const theirDamage = 600;
        const priority = theirDamage / hitsToKill;
        // reduce priority if tower is out of energy
        if (tower.energy < 10) {
            return priority / Math.pow(hitsToKill, 2);
        }
        return priority;
    }

    function spawnValue(spawn: Spawn, myDamage: number) {
        const hitsToKill = getHitsToKill(spawn, myDamage);
        return 100 / hitsToKill;
    }

    function storageValue(storage: Storage, myDamage: number) {
        const hitsToKill = getHitsToKill(storage, myDamage);
        return Math.sqrt(_.sum(storage.store)) / hitsToKill;
    }

    function getHitsToKill(structure: Structure, myDamage: number) {
        const rampart = util.filter(structure.pos.lookFor<Structure>(LOOK_STRUCTURES), o => util.isRampart(o))[0];
        const hits = structure.hits + (rampart ? rampart.hits : 0);
        return hits / myDamage;
    }

    function hostileCreepValue(hostileCreep: Creep, myDamage: number, isMelee: boolean) {
        var value = creepValue(hostileCreep, myDamage);
        if (isMelee) {
            const theirDamage = ATTACK_POWER * hostileCreep.getActiveBodyparts(ATTACK);
            value -= creepValue(creep, theirDamage);
        }
        return value;
    }

    function creepValue(targetCreep: Creep, myDamage: number) {
        // TODO should we consider that a creep can be healed?
        const bodyParts = util.filter(targetCreep.body, o => o.hits > 0);

        const rampart = util.filter(targetCreep.pos.lookFor<Structure>(LOOK_STRUCTURES), o => util.isRampart(o))[0];
        const rampartHits = rampart ? rampart.hits : 0;
        const myAdjustedDamage = Math.max(0, myDamage - rampartHits);

        const numberOfBodyPartsICanKill = Math.max(0, Math.min(bodyParts.length,
            (myAdjustedDamage >= bodyParts[0].hits ? 1 : 0) + Math.floor((myAdjustedDamage - bodyParts[0].hits) / 100)));

        const numberOfImportantPartsICanKill = util.filter(bodyParts.slice(0, numberOfBodyPartsICanKill), o =>
            o.type === ATTACK || o.type === RANGED_ATTACK || o.type === HEAL).length;

        const numberOfImportantPartsTotal = util.filter(bodyParts, o =>
            o.type === ATTACK || o.type === RANGED_ATTACK || o.type === HEAL).length;

        const hitsToKill = (rampartHits + (100 * bodyParts.length)) / myDamage;

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
}