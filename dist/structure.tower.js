"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
function runAll() {
    for (let roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        const towers = room.find(FIND_MY_STRUCTURES, { filter: o => util.isTower(o) });
        for (let i = 0; i < towers.length; i++) {
            if (attackOrHeal(towers[i]))
                continue;
            repair(towers[i]);
        }
    }
}
exports.runAll = runAll;
function repair(tower) {
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
        }
    }
}
function attackOrHeal(tower) {
    var enemies = tower.room.find(FIND_HOSTILE_CREEPS);
    var damagedAllies = tower.room.find(FIND_MY_CREEPS, { filter: o => o.hits < o.hitsMax });
    if (enemies.length || damagedAllies.length) {
        if (attackEnemiesInRange(5))
            return true;
        if (healAlliesInRange(5))
            return true;
        if (attackEnemiesInRange(10))
            return true;
        if (healAlliesInRange(10))
            return true;
        if (attackEnemiesInRange(19))
            return true;
        if (healAlliesInRange(19))
            return true;
        if (attackEnemiesInRange(100))
            return true;
        if (healAllies())
            return true;
        if (attackEnemies())
            return true;
    }
    return false;
    function attackEnemies() {
        if (enemies.length) {
            tower.attack(enemies[0]);
            return true;
        }
        return false;
    }
    function attackEnemiesInRange(range) {
        var nearbyEnemies = _.filter(enemies, o => o.pos.inRangeTo(tower.pos, range));
        if (nearbyEnemies.length) {
            tower.attack(nearbyEnemies[0]);
            return true;
        }
        return false;
    }
    function healAllies() {
        if (damagedAllies.length) {
            tower.heal(damagedAllies[0]);
            return true;
        }
        return false;
    }
    function healAlliesInRange(range) {
        var nearbyDamagedAllies = _.filter(damagedAllies, o => o.pos.inRangeTo(tower.pos, range));
        if (nearbyDamagedAllies.length) {
            tower.heal(nearbyDamagedAllies[0]);
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=structure.tower.js.map