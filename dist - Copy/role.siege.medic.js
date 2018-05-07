var map = require('map');
var util = require('util');

module.exports = {
    run: function(creep) {
        
        if (util.moveToMoveTarget(creep)) return;
        
        var ramsAttacking = util.countCreeps('batteringRam', o => o.room.name === creep.memory.assignedRoomName);
        
         if (creep.room.name === creep.memory.assignedRoomName) {
            // if there are no battering rams to heal, or the medic is low on health, it should retreat
            if (!ramsAttacking || creep.hits < creep.hitsMax / 2) {
                retreat();
                return;
            }
            heal();
        }
        else {
            // see if we need to move into the target room yet
            var waitOutside = !ramsAttacking || creep.hits < creep.hitsMax || creep.memory.wait;
            map.navigateToRoom(creep, creep.memory.assignedRoomName, waitOutside);
            heal();
        }
        
        function heal() {
            var sortedAllies =  _.sortBy(creep.room.find(FIND_MY_CREEPS), o => o.hits / o.hitsMax);
            var weakestAlly = sortedAllies[0];
            // this could be made smarter. we don't want to chase around the weakest ally if there is a damaged ally already nearby.
            // but if the weakest ally is fairly close, and it's much weaker than the closest damaged ally, we still want to move to it.
            if (weakestAlly !== creep) {
                creep.moveTo(weakestAlly);   
            }
            for (var i in sortedAllies) {
                var ally = sortedAllies[i];
                if (ally !== creep) {
                    if (creep.heal(ally) === OK) return;   
                }
            }
            var closestBatteringRam =  creep.pos.findClosestByPath(FIND_MY_CREEPS, { filter: o => o.memory.role === 'batteringRam' });
            if (closestBatteringRam) {
                creep.moveTo(closestBatteringRam);
            }
        }
        
        function retreat() {
            map.navigateToRoom(creep, creep.memory.homeRoomName);
        }
    }
};