import * as map from './map';
import * as util from './util';
import * as rooms from './rooms';
import * as cache from './cache';
import * as spawnSiege from './manager.spawn.siege';
import * as sourceManager from './manager.sources';
import * as spawnOrders from './manager.spawn.orders';

export function run() {

    const controlDirectives: rooms.ControlDirective[] = _.filter(rooms.getControlDirectives(),
        (o: rooms.ControlDirective) => o.doClaim || o.doReserve);

    const username = _.find(Game.structures).owner.username;

    for (let i in controlDirectives) {
        const d = controlDirectives[i];
        sourceManager.run(d.roomName);
        runRoomSpawn(d.roomName, d.doClaim);
    }

    if (Memory['siegeMode']) {
        spawnSiege.run();
    }

    function runRoomSpawn(roomName: string, doClaim: boolean) {

        var room = Game.rooms[roomName];

        if (!room || !room.find(FIND_MY_SPAWNS).length) {
            // there are no spawns in this room. if we want to set up a colony in this room, we'll need colonists.
            if (doClaim) {
                runColonistSpawn();
                return;
            } else {
                // we only want to reserve the room, not claim it.
                // we don't return here, so the rest of runRoomSpawn will execute as normal.
                spawnClaimers();
                // do return if we don't have eyes in the room. the claimer will give us eyes.
                if (!room) return;
            }
        }

        var wartime = util.isWartime(room);

        /////////////////////////////////////////////////////////////////////////////////////////
        // TODO cache orders with infinite time, and expire them when a creep dies or is spawned
        /////////////////////////////////////////////////////////////////////////////////////////

        const roomOrder = spawnOrders.getRoomOrder(roomName, doClaim, wartime);

        const activeSources = room.find<Source | Mineral>(FIND_SOURCES, { filter: (o: Source) => util.isSourceActive(o) });
        const activeMinerals = room.find<Source | Mineral>(FIND_MINERALS, { filter: (o: Mineral) => util.isMineralActive(o) });
        const activeSourcesAndMinerals = activeSources.concat(activeMinerals);

        for (let i in activeSourcesAndMinerals) {
            const sourceOrder = spawnOrders.getSourceOrder(activeSourcesAndMinerals[i].id, doClaim, wartime);
        }
    }
}

function spawnForWartime() {
}

function spawnForPeacetime() {
}

function runColonistSpawn() {
}

function spawnClaimers() {
}