var util = require('util');

module.exports = {
    run: function() {
        
        var spawn = Game.spawns['Spawn1'];
        
        var homeRoomName = 'E51S16';
        var targetRoomName = 'E51S15';
        var batteringRamCount = 1;
        var medicCount = 0;
        var cavalierCount = 0;
        
        var targetRoom = Game.rooms[targetRoomName];
        if (targetRoom && targetRoom.controller && targetRoom.controller.my) {
            // this room has been captured by us. hooray! no more siege.
            return;
        }
        
        if (util.countCreeps('batteringRam') < batteringRamCount) {
            spawnBatteringRam();
        }
        if (util.countCreeps('medic') < medicCount) {
            spawnMedic();
        }
        if (util.countCreeps('cavalier') < cavalierCount) {
            spawnCavalier();
        }
        
        // only spawn a downgrader once the spawn has been destroyed and only if upgrade is not blocked for very much longer
        if (targetRoom && targetRoom.controller && targetRoom.controller.upgradeBlocked < 100
        && !targetRoom.find(FIND_HOSTILE_SPAWNS).length && !util.countCreeps('downgrader')) {
            spawnDowngrader();
        }
        
        function spawnBatteringRam() {
            const role = 'batteringRam';
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
                TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,
                ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,
                MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE
            ]
            return spawnCreep(role, body);
        }
        
        function spawnMedic() {
            const role = 'medic';
            const body = [
                TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,
                TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,
                HEAL,HEAL,HEAL,HEAL,HEAL,
                HEAL,HEAL,HEAL,
                MOVE,MOVE,MOVE,MOVE
                ];
            return spawnCreep(role, body);
        }
        
        function spawnCavalier() {
            const role = 'cavalier';
            // cavaliers are for hunting and killing hostile creeps.
            // these are necessary to defend our battering rams against hostile ranged attackers.
            // this body has 22 parts and costs 2,300 (550 for move, 1,500 for ranged attack, 250 for heal)
            const body = [
                RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,
                RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,
                MOVE,MOVE,MOVE,MOVE,MOVE,
                MOVE,MOVE,MOVE,MOVE,MOVE,
                MOVE,
                HEAL
                ];
            return spawnCreep(role, body);
        }
        
        function spawnClaimer() {
            const role = 'claimer';
            const body = [CLAIM,CLAIM,CLAIM,MOVE,MOVE,MOVE];
            return spawnCreep(role, body);
        }
        
        function spawnCreep(role, body) {
            const name = role + Game.time;
            return spawn.spawnCreep(body, name, { memory: { 
                role: role,
                homeRoomName: homeRoomName,
                assignedRoomName: targetRoomName
            }});
        }
    }
}