"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const rooms = require("./rooms");
const spawnSiege = require("./manager.spawn.siege");
const sourceManager = require("./manager.sources");
const spawnOrders = require("./manager.spawn.orders");
function run() {
    const controlDirectives = _.filter(rooms.getControlDirectives(), (o) => o.doClaim || o.doReserve);
    const username = _.find(Game.structures).owner.username;
    for (let i in controlDirectives) {
        const d = controlDirectives[i];
        sourceManager.run(d.roomName);
        runRoomSpawn(d.roomName, d.doClaim);
    }
    if (Memory['siegeMode']) {
        spawnSiege.run();
    }
    function runRoomSpawn(roomName, doClaim) {
        var room = Game.rooms[roomName];
        if (!room || !room.find(FIND_MY_SPAWNS).length) {
            // there are no spawns in this room. if we want to set up a colony in this room, we'll need colonists.
            if (doClaim) {
                runColonistSpawn();
                return;
            }
            else {
                // we only want to reserve the room, not claim it.
                // we don't return here, so the rest of runRoomSpawn will execute as normal.
                spawnClaimers();
                // do return if we don't have eyes in the room. the claimer will give us eyes.
                if (!room)
                    return;
            }
        }
        var wartime = util.isWartime(room);
        /////////////////////////////////////////////////////////////////////////////////////////
        // TODO cache orders with infinite time, and expire them when a creep dies or is spawned
        /////////////////////////////////////////////////////////////////////////////////////////
        const roomOrder = spawnOrders.getRoomOrder(roomName, doClaim, wartime);
        const activeSources = room.find(FIND_SOURCES, { filter: (o) => util.isSourceActive(o) });
        const activeMinerals = room.find(FIND_MINERALS, { filter: (o) => util.isMineralActive(o) });
        const activeSourcesAndMinerals = activeSources.concat(activeMinerals);
        for (let i in activeSourcesAndMinerals) {
            const sourceOrder = spawnOrders.getSourceOrder(activeSourcesAndMinerals[i].id, doClaim, wartime);
        }
    }
}
exports.run = run;
function spawnForWartime() {
}
function spawnForPeacetime() {
}
function runColonistSpawn() {
}
function spawnClaimers() {
}
//# sourceMappingURL=manager.spawn - Copy.js.map