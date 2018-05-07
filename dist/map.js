"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const rooms = require("./rooms");
function findNearbySpawns(roomName) {
    // use cache if it exists and is younger than 100 ticks
    var roomMemory = Memory.rooms[roomName] || {};
    if (roomMemory.nearbySpawns && roomMemory.lastFoundNearbySpawns > Game.time - 100) {
        return roomMemory.nearbySpawns;
    }
    var spawns = [];
    for (var i in Game.spawns) {
        var spawn = Game.spawns[i];
        if (roomName === spawn.room.name) {
            spawns.push({ id: spawn.id, distance: 0 });
        }
        else if (Game.map.getRoomLinearDistance(roomName, spawn.room.name) <= 4) {
            var route = Game.map.findRoute(spawn.room.name, roomName);
            if (route !== ERR_NO_PATH) {
                spawns.push({ id: spawn.id, distance: route.length });
            }
        }
    }
    roomMemory.nearbySpawns = spawns;
    roomMemory.lastFoundNearbySpawns = Game.time;
    Memory.rooms[roomName] = roomMemory;
    return spawns;
}
exports.findNearbySpawns = findNearbySpawns;
function navigateToRoom(creep, targetRoomName, waitOutside) {
    const flag = rooms.getFlag(targetRoomName);
    if (!flag)
        return false;
    util.setMoveTargetFlag(creep, flag, 100);
    return true;
    //if (creep.memory.isWaiting) {
    //    if (waitOutside) return false;
    //    else creep.memory.isWaiting = false;
    //}
    //var route = Game.map.findRoute(creep.room, targetRoomName);
    //if (route !== ERR_NO_PATH && (route as any).length > 0) {
    //    var exit = creep.pos.findClosestByPath<RoomPosition>(route[0].exit);
    //    if (!exit) return false;
    //    if ((route as any).length === 1 && waitOutside && creep.pos.findPathTo(exit).length < 4) {
    //        // ideally the creep would move away from the exit a few steps to make room for other creeps that are trying to get out of a hostile room
    //        // set a flag so we don't have to do this expensive calculation every tick while the creep is waiting
    //        creep.memory.isWaiting = true;
    //        return false;
    //    }
    //    if (creep.pos === exit) {
    //        creep.move(route[0].exit);
    //        util.setMoveTarget(creep, null);
    //        return true;
    //    }
    //    util.setMoveTargetExit(creep, exit.x, exit.y, exit.roomName, route[0].room);
    //    return true;
    //}
    //return false;
}
exports.navigateToRoom = navigateToRoom;
//# sourceMappingURL=map.js.map