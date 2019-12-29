import * as util from './util';
import * as cache from './cache';

// For walls within 8 spaces of the tower, it's more energy-efficient to build up the wall using
// the tower than using builders (not to mention faster).
export const WALL_RANGE = 8;

export function runAll() {
    for (let roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        const towers = room.find<StructureTower>(FIND_MY_STRUCTURES, { filter: o => util.isTower(o) });
        for (let i = 0; i < towers.length; i++) {
            const tower = towers[i];
            if (attackOrHeal(tower)) continue;
            if (repair(tower)) continue;
            buildUpWalls(tower);
        }
    }
}

function repair(tower: StructureTower) {
    if (Game.time % 7 === 0) {
        const damagedStructures = tower.room.find(FIND_STRUCTURES, {
            filter: o => {
                // towers should not repair walls or ramparts
                return o.structureType != STRUCTURE_WALL
                    && o.structureType != STRUCTURE_RAMPART
                    // towers should only repair structures that are slightly damaged (major damage should be repaired by builders)
                    && o.hits / o.hitsMax >= 0.8
                    && o.hits < o.hitsMax
                    // this tower should not repair a structure if there is another tower in the room that is closer to that structure
                    && (util.findNearestStructure(o.pos, STRUCTURE_TOWER).id === tower.id);
            }
        });
        if (damagedStructures.length) {
            tower.repair(damagedStructures[0]);
            return true;
        }
    }
    return false;
}

function buildUpWalls(tower: StructureTower) {
    const targetId = cache.get('4ab6a1ff-ef0a-4302-8533-a2ad19d6435b-' + tower.id, 21, () => {
        const allWalls = tower.room.find(FIND_STRUCTURES, { filter: o => util.isWall(o) || util.isRampart(o) });
        const maxWallHits = util.max(allWalls, o => o.hits);
        const availableWalls = util.filter(allWalls, o => {
            return o.hits < o.hitsMax && o.hits < maxWallHits && tower.pos.inRangeTo(o, WALL_RANGE);
        });
        if (availableWalls.length) {
            const sortedWalls = util.sortBy(availableWalls, o => o.hits);
            return sortedWalls[0].id;
        }
        return null;
    });
    if (targetId && Game.getObjectById(targetId)) {
        tower.repair(Game.getObjectById(targetId));
    }
}

function attackOrHeal(tower: StructureTower) {

    const enemies = tower.room.find(FIND_HOSTILE_CREEPS);
    const allies = tower.room.find(FIND_MY_CREEPS, { filter: o => o.hits < o.hitsMax });
    const importantAllies = util.filter(allies, o => isCreepImportant(o));
    const unimportantAllies = util.filter(allies, o => !isCreepImportant(o));

    if (enemies.length || allies.length) {
        if (attackInRange(enemies, 5)) return true;
        if (healInRange(importantAllies, 5)) return true;
        if (attackInRange(enemies, 10)) return true;
        if (healInRange(importantAllies, 10)) return true;
        if (healInRange(unimportantAllies, 5)) return true;
        if (attackInRange(enemies, 19)) return true;
        if (healInRange(importantAllies, 19)) return true;
        if (healInRange(unimportantAllies, 10)) return true;
        if (attackInRange(enemies, 100)) return true;
        if (healInRange(importantAllies, 100)) return true;
        if (healInRange(unimportantAllies, 19)) return true;
        if (healInRange(unimportantAllies, 100)) return true;
    }

    return false;

    function isCreepImportant(creep: Creep) {
        return util.any(creep.body, o => o.type === ATTACK || o.type === RANGED_ATTACK || o.type === HEAL);
    }

    function attackInRange(creeps: Array<Creep>, range) {
        var creepsInRange = util.filter(creeps, o => o.pos.inRangeTo(tower.pos, range));
        if (creepsInRange.length) {
            tower.attack(creepsInRange[0]);
            return true;
        }
        return false;
    }

    function healInRange(creeps: Array<Creep>, range) {
        var creepsInRange = util.filter(creeps, o => o.pos.inRangeTo(tower.pos, range));
        if (creepsInRange.length) {
            tower.heal(creepsInRange[0]);
            return true;
        }
        return false;
    }
}