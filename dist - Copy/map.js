var util = require('util');

function getHostileRooms() {
    return Memory.hostileRooms || [];
}

function findHelperSpawns(roomName) {
    // use cache if it exists and is younger than 100 ticks
    var roomMemory = Memory.rooms[roomName] || {};
    if (roomMemory.helperSpawnIds && roomMemory.lastFoundHelperSpawns > Game.time - 100) {
        return roomMemory.helperSpawnIds.map(o => Game.getObjectById(o));
    }
    
    var helperSpawns = [Game.spawns['Spawn1']];
    
    // for (var i in Game.spawns) {
    //     var spawn = Game.spawns[i];
    //     if (spawn.room.controller.level < 5 || Game.map.getRoomLinearDistance(roomName, spawn.room.name) > 4) continue;
    //     var route = Game.map.findRoute(spawn.room.name, roomName);
    // }
    
    roomMemory.helperSpawnIds = helperSpawns.map(o => o.id);
    roomMemory.lastFoundHelperSpawns = Game.time;
    Memory.rooms[roomName] = roomMemory;
    
    return helperSpawns;
}

function navigateToRoom(creep, targetRoomName, waitOutside) {
    if (creep.memory.isWaiting) {
        if (waitOutside) return false;
        else creep.memory.isWaiting = false;
    }
    var route = Game.map.findRoute(creep.room, targetRoomName);
    if (route.length > 0) {
        var exit = creep.pos.findClosestByPath(route[0].exit);
        if (route.length === 1 && waitOutside && creep.pos.findPathTo(exit).length < 4) {
            // ideally the creep would move away from the exit a few steps to make room for other creeps that are trying to get out of a hostile room
            // set a flag so we don't have to do this expensive calculation every tick while the creep is waiting
            creep.memory.isWaiting = true;
            return false;
        }
        if (creep.pos === exit) {
            creep.move(route[0].exit);
            return true;
        }
        util.setMoveTarget(creep, exit, 0);
        return true;
    }
    return false;
}

module.exports = {
    findHelperSpawns: findHelperSpawns,
    navigateToRoom: navigateToRoom
};