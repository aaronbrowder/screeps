"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
function run(tower) {
    var enemies = tower.room.find(FIND_HOSTILE_CREEPS);
    var damagedAllies = tower.room.find(FIND_MY_CREEPS, { filter: o => o.hits < o.hitsMax });
    if (enemies.length || damagedAllies.length) {
        if (attackEnemiesInRange(5))
            return;
        if (healAlliesInRange(5))
            return;
        if (attackEnemiesInRange(10))
            return;
        if (healAlliesInRange(10))
            return;
        if (attackEnemiesInRange(19))
            return;
        if (healAlliesInRange(19))
            return;
        if (attackEnemiesInRange(100))
            return;
        if (healAllies())
            return;
        if (attackEnemies())
            return;
    }
    if (Game.time % 7 === 0) {
        const damagedStructures = tower.room.find(FIND_STRUCTURES, {
            filter: o => {
                // towers should not repair walls or ramparts
                return o.structureType != STRUCTURE_WALL
                    && o.structureType != STRUCTURE_RAMPART
                    && o.hits / o.hitsMax >= 0.8
                    && o.hits < o.hitsMax
                    && (util.findNearestStructure(o.pos, STRUCTURE_TOWER).id === tower.id);
            }
        });
        if (damagedStructures.length) {
            tower.repair(damagedStructures[0]);
        }
    }
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
exports.run = run;
//# sourceMappingURL=structure.tower.js.map