"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
function run(roomName) {
    Memory.sourceMetrics = Memory.sourceMetrics || {};
    const room = Game.rooms[roomName];
    if (!room)
        return;
    const sources = room.find(FIND_SOURCES);
    for (let i in sources) {
        runSourceMetrics(sources[i]);
    }
}
exports.run = run;
function runSourceMetrics(source) {
    var sourceMetrics = Memory.sourceMetrics[source.id];
    // we can run this procedure very rarely because it will very rarely change
    if (sourceMetrics && Game.time % 10000 !== 0)
        return;
    if (!sourceMetrics)
        sourceMetrics = {};
    console.log('running source metrics for source ' + source);
    const nearestRepository = findNearestRepository(source);
    if (nearestRepository) {
        sourceMetrics.transportDistance = nearestRepository.distance;
        Memory.sourceMetrics[source.id] = sourceMetrics;
    }
}
function getRoomsToSearch(startingRoom) {
    const roomNames = [startingRoom.name];
    // get repositories in nearby rooms, sorted by linear room distance
    const repositories = _.filter(Game.structures, o => (util.isLink(o) || util.isSpawn(o)))
        .map((o) => {
        return {
            repository: o,
            distance: Game.map.getRoomLinearDistance(o.room.name, startingRoom.name)
        };
    });
    const nearbyRepositories = _.filter(repositories, (o) => o.distance <= 2);
    const sortedRepositories = _.sortBy(nearbyRepositories, (o) => o.distance);
    for (let i in sortedRepositories) {
        const info = sortedRepositories[i];
        if (roomNames.indexOf(info.repository.room.name) === -1) {
            roomNames.push(info.repository.room.name);
        }
    }
    return roomNames;
}
function findNearestRepository(source) {
    return _.sortBy(findRepositories(source), (o) => o.distance)[0];
}
function findRepositories(source) {
    var infos = [];
    const roomsToSearch = getRoomsToSearch(source.room);
    for (let i in roomsToSearch) {
        const room = Game.rooms[roomsToSearch[i]];
        if (!room)
            continue;
        // find a route from the source room to the repository room
        var route = null;
        if (source.room.name !== room.name) {
            const routeResult = Game.map.findRoute(source.room, room, { routeCallback: routeCallback });
            // if there's no route between the rooms, we can't use repositories in this room
            if (util.isNumber(routeResult))
                continue;
            route = routeResult;
        }
        const repositories = findRepositoriesInRoom(room);
        for (let j in repositories) {
            const repository = repositories[j];
            const distance = measureDistance(source, repository, route);
            if (distance >= 0) {
                infos.push({
                    repository: repository,
                    distance: distance
                });
            }
        }
    }
    return infos;
}
function findRepositoriesInRoom(room) {
    return room.find(FIND_MY_STRUCTURES, {
        filter: o => util.isLink(o) || util.isSpawn(o)
    });
}
function routeCallback(roomName, fromRoomName) {
    const room = Game.rooms[roomName];
    // it's not ideal to use a room if we don't know what's in there
    if (!room)
        return 3;
    const ctrl = room.controller;
    if (ctrl) {
        var username = _.find(Game.structures).owner.username;
        // avoid rooms owned by other players
        if (ctrl.owner && !ctrl.my)
            return Infinity;
        // prefer rooms owned or reserved by me
        if (ctrl.my || (ctrl.reservation && ctrl.reservation.username === username))
            return 1;
    }
    // the room is owned by no one
    return 2;
}
function measureDistance(source, repository, route) {
    var path;
    var exit;
    var startPos = source.pos;
    var distance = 0;
    if (route && route.length) {
        for (let i in route) {
            const routePart = route[i];
            if (!startPos) {
                // we don't have eyes in this room. just guess at the distance to traverse it.
                exit = null;
                path = null;
                distance += 50;
            }
            else {
                // measure the distance from the start position to the room exit
                exit = startPos.findClosestByPath(routePart.exit);
                path = startPos.findPathTo(exit);
                if (path && path.length)
                    distance += path.length;
                else
                    return -1;
            }
            // the next start pos is in the next room with the exit inverted
            startPos = getEntrancePosition(Game.rooms[routePart.room], routePart.exit, exit);
        }
    }
    // We are in the repository's room now. Measure the distance from the start position to the repository.
    path = startPos.findPathTo(repository);
    if (path && path.length)
        distance += path.length;
    else
        return -1;
    return distance;
}
function getEntrancePosition(room, otherExit, otherExitPos) {
    if (!room)
        return null;
    // in case otherExit is not available, just pick a random exit position
    const someExitPos = room.find(otherExit)[0];
    if (!otherExitPos && !someExitPos)
        return null;
    const otherX = otherExitPos ? otherExitPos.x : someExitPos.x;
    const otherY = otherExitPos ? otherExitPos.y : someExitPos.y;
    switch (otherExit) {
        case FIND_EXIT_BOTTOM: return room.getPositionAt(otherX, 0);
        case FIND_EXIT_TOP: return room.getPositionAt(otherX, 49);
        case FIND_EXIT_RIGHT: return room.getPositionAt(0, otherY);
        case FIND_EXIT_LEFT: return room.getPositionAt(49, otherY);
        default: return null;
    }
}
//# sourceMappingURL=manager.sources.js.map