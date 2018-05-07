var util = require('util');

module.exports = {
    run: function(tower) {
        
        var enemies = tower.room.find(FIND_HOSTILE_CREEPS);
        var damagedAllies = tower.room.find(FIND_MY_CREEPS, { filter: o => o.hits < o.hitsMax });
        
        if (enemies.length || damagedAllies.length) {
            if (attackEnemiesInRange(5)) return;
            if (healAlliesInRange(5)) return;
            if (attackEnemiesInRange(10)) return;
            if (healAlliesInRange(10)) return;
            if (attackEnemiesInRange(19)) return;
            if (healAlliesInRange(19)) return;
            if (attackEnemiesInRange(100)) return;   
        }
        
        if (Game.time % 7 === 0) {
            const damagedStructures = tower.room.find(FIND_STRUCTURES, { filter: o => {
                // towers should not repair walls or ramparts
                return o.structureType != STRUCTURE_WALL 
                    && o.structureType != STRUCTURE_RAMPART
                    // towers should only repair structures that are slightly damaged (major damage should be repaired by builders)
                    && o.hits / o.hitsMax >= 0.8
                    && o.hits < o.hitsMax
                    // don't repair roads that haven't been used in a long time (we apparently don't need those roads anymore)
                    //&& (o.structureType != STRUCTURE_ROAD || (Memory.roadUsage[o.id] && Memory.roadUsage[o.id] > Game.time - 1000))
                    // this tower should not repair a structure if there is another tower in the room that is closer to that structure
                    && (util.findNearestStructure(o.pos, STRUCTURE_TOWER).id === tower.id);
            }});
            if (damagedStructures.length) {
                tower.repair(damagedStructures[0]);
            }
        }
        
        function attackEnemiesInRange(range) {
            var nearbyEnemies = _.filter(enemies, o => o.pos.inRangeTo(tower.pos, range));
            if (nearbyEnemies.length) {
                tower.attack(nearbyEnemies[0]);
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
};