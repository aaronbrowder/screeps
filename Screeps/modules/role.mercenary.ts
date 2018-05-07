import * as util from './util';

const SUCCESS = 0;
const FAILURE = 1;
const ON_RAMPART = 2;
const NO_RAMPART = 3;
const WAITING_FOR_RAMPART = 4;

export function run(creep) {

    var hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
    if (!creep.room.memory.hasWallBreach) {
        if (hostiles.length) {
            // there are hostiles in the room, but so far the wall is intact
            blueProtocol();
        } else {
            // the wall is intact and there are no hostiles. there is no need for mercenaries, so recycle them.
            util.goToRecycle(creep);
        }
    } else if (hostiles.length) {
        // the hostiles have broken through the wall
        redProtocol();
    }

    function redProtocol() {
        // TODO if creep is ranged only and is adjacent to a melee hostile, it should move away
        // TODO creep should find and plug a wall breach that is not already plugged by another creep
        // TODO even though there is a breach, creep should still stand on rampart if it's convenient
        attack(true);
    }

    function blueProtocol() {
        // TODO should we attack ranged hostiles before attacking melee hostiles?
        const goToRampartResult = goToRampart();
        if (goToRampartResult === ON_RAMPART) {
            if (attack() === FAILURE) {
                const closestCreep = creep.pos.findClosestByRange(FIND_MY_CREEPS, { filter: o => o.id !== creep.id });
                if (creep.pos.inRangeTo(closestCreep, 1)) {
                    // we are on a rampart but we can't hit any hostiles from here. we should move off the
                    // rampart and let another creep move on who may be able to make better use of the rampart.
                    // (move towards the spawn so we stay on the safe side of the wall.)
                    creep.moveTo(util.findNearestStructure(creep.pos, STRUCTURE_SPAWN));
                }
            }
        }
        if (goToRampartResult === WAITING_FOR_RAMPART || goToRampartResult === NO_RAMPART) {
            if (attack() === FAILURE) {
                // TODO check if the creep is in range of enemy attack. if so, it should move out of attack range.
                // (it should move two spaces out of attack range because otherwise it will just move back into attack range next tick)
            }
        }
    }

    function goToRampart() {
        // TODO if creep is on a rampart but there are no hostiles nearby, it should move to a different rampart that
        // does have hostiles nearby
        const isOnRampart = !!_.filter(creep.pos.lookFor(LOOK_STRUCTURES), o => o.structureType == STRUCTURE_RAMPART).length;
        if (isOnRampart) return ON_RAMPART;
        const ramparts = creep.room.find(FIND_MY_STRUCTURES, { filter: o => o.structureType == STRUCTURE_RAMPART });
        const unoccupiedRamparts = _.filter(ramparts, o => !o.pos.lookFor(LOOK_CREEPS).length);
        if (unoccupiedRamparts.length) {
            const rampartsNearHostiles = _.filter(unoccupiedRamparts, o =>
                o.pos.findClosestByRange(hostiles).pos.isNearTo(o.pos)
            );
            if (rampartsNearHostiles.length) {
                creep.moveTo(creep.pos.findClosestByRange(rampartsNearHostiles));
            } else {
                creep.moveTo(creep.pos.findClosestByRange(unoccupiedRamparts));
            }
            return SUCCESS;
        }
        if (ramparts.length) {
            // TODO we only really want this if creep is ranged! melee creeps will be vulnerable while not on a rampart.
            // all ramparts are occupied. if we try to move to the nearest rampart, the path finding will be successful but
            // when it comes time to actually move into the occupied space, the creep will just not move there. the result
            // is that the creep will be as close as possible to the rampart, which is what we want.
            creep.moveTo(util.findNearestStructure(creep.pos, STRUCTURE_RAMPART));
            return WAITING_FOR_RAMPART;
        }
        return NO_RAMPART;
    }

    function attack(moveIfNecessary?) {
        const target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        const attackResult = creep.attack(target);
        if (attackResult == OK) return SUCCESS;
        if (attackResult == ERR_NOT_IN_RANGE || attackResult == ERR_NO_BODYPART) {
            // TODO try using ranged mass attack
            const rangedAttackResult = creep.rangedAttack(target);
            if (rangedAttackResult == OK) return SUCCESS;
            if (moveIfNecessary && rangedAttackResult == ERR_NOT_IN_RANGE || rangedAttackResult == ERR_NO_BODYPART) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#f00' } });
            }
        };
        return FAILURE;
    }
}