"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const map = require("./map");
const util = require("./util");
function run(creep) {
    if (util.moveToMoveTarget(creep))
        return;
    var crushersAttacking = util.countCreeps('crusher', o => o.room.name === creep.memory.assignedRoomName);
    if (creep.room.name === creep.memory.assignedRoomName) {
        // if there are no battering rams to heal, or the medic is low on health, it should retreat
        if (!crushersAttacking || creep.hits < creep.hitsMax / 2) {
            retreat();
            return;
        }
        heal();
    }
    else {
        // see if we need to move into the target room yet
        var waitOutside = !crushersAttacking || creep.hits < creep.hitsMax || creep.memory.wait;
        map.navigateToRoom(creep, creep.memory.assignedRoomName, waitOutside);
        heal();
    }
    function heal() {
        var sortedAllies = _.sortBy(creep.room.find(FIND_MY_CREEPS), o => o.hits / o.hitsMax);
        var weakestAlly = sortedAllies[0];
        // this could be made smarter. we don't want to chase around the weakest ally if there is a damaged ally already nearby.
        // but if the weakest ally is fairly close, and it's much weaker than the closest damaged ally, we still want to move to it.
        if (weakestAlly !== creep) {
            creep.moveTo(weakestAlly);
        }
        for (var i in sortedAllies) {
            var ally = sortedAllies[i];
            if (ally !== creep) {
                if (creep.heal(ally) === OK)
                    return;
            }
        }
        var closestCrusher = creep.pos.findClosestByPath(FIND_MY_CREEPS, { filter: o => o.memory.role === 'crusher' });
        if (closestCrusher) {
            creep.moveTo(closestCrusher);
        }
    }
    function retreat() {
        map.navigateToRoom(creep, creep.memory.homeRoomName);
    }
}
exports.run = run;
//# sourceMappingURL=role.siege.medic.js.map