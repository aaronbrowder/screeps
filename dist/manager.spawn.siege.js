"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
function run() {
    // TODO set this spawn to the home room spawn
    var spawn = Game.spawns['Spawn2'];
    var homeRoomName = 'E44N32';
    var targetRoomName = 'E43N32';
    var crusherCount = 0;
    var medicCount = 0;
    var hunterCount = 1;
    var targetRoom = Game.rooms[targetRoomName];
    //if (targetRoom && targetRoom.controller && targetRoom.controller.my) {
    //    // this room has been captured by us. hooray! no more siege.
    //    return;
    //}
    if (util.countCreeps('crusher') < crusherCount) {
        spawnCrusher();
    }
    if (util.countCreeps('medic') < medicCount) {
        spawnMedic();
    }
    if (util.countCreeps('hunter') < hunterCount) {
        spawnHunter();
    }
    // only spawn a claimer once the spawn has been destroyed and only if upgrade is not blocked for very much longer
    if (targetRoom && targetRoom.controller && targetRoom.controller.upgradeBlocked < 100
        && !targetRoom.find(FIND_HOSTILE_SPAWNS).length && !util.countCreeps('downgrader')) {
        spawnClaimer();
    }
    function spawnCrusher() {
        const role = 'crusher';
        // const body = [
        //     TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,
        //     TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,
        //     TOUGH,TOUGH,TOUGH,TOUGH,
        //     ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,
        //     ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,
        //     ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,
        //     ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,
        //     ATTACK,ATTACK,
        //     MOVE,MOVE,MOVE,MOVE,MOVE,
        //     MOVE,MOVE,MOVE
        //     ];
        const body = [
            TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
            ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
            ATTACK,
            MOVE, MOVE, MOVE, MOVE, MOVE,
            MOVE, MOVE, MOVE, MOVE
        ];
        return spawnCreep(role, body);
    }
    function spawnMedic() {
        const role = 'medic';
        const body = [
            TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
            TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
            HEAL, HEAL, HEAL, HEAL, HEAL,
            HEAL, HEAL, HEAL,
            MOVE, MOVE, MOVE, MOVE
        ];
        return spawnCreep(role, body);
    }
    function spawnHunter() {
        const role = 'hunter';
        // hunters are for hunting and killing hostile creeps.
        // these are necessary to defend our battering rams against hostile ranged attackers.
        // this body has 22 parts and costs 2,300 (550 for move, 1,500 for ranged attack, 250 for heal)
        //const body = [
        //    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
        //    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
        //    MOVE, MOVE, MOVE, MOVE, MOVE,
        //    MOVE, MOVE, MOVE, MOVE, MOVE,
        //    MOVE,
        //    HEAL
        //];
        //const body = [
        //    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
        //    MOVE, MOVE, MOVE, MOVE, MOVE,
        //    MOVE,
        //    HEAL
        //];
        const body = [
            MOVE, MOVE,
            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
            MOVE
        ];
        return spawnCreep(role, body);
    }
    function spawnClaimer() {
        const role = 'claimer';
        const body = [CLAIM, CLAIM, CLAIM, MOVE, MOVE, MOVE];
        return spawnCreep(role, body);
    }
    function spawnCreep(role, body) {
        const name = role + Game.time;
        const memory = {
            role: role,
            homeRoomName: homeRoomName,
            assignedRoomName: targetRoomName
        };
        return spawn.spawnCreep(body, name, { memory: memory });
    }
}
exports.run = run;
//# sourceMappingURL=manager.spawn.siege.js.map