"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const map = require("./map");
function getSourceMetrics(source) {
    var metrics = getMetrics(source.id);
    if (!metrics || !metrics.timestamp || Game.time - metrics.timestamp > 10000) {
        const nearestRepository = findNearestRepository(source);
        metrics = {
            timestamp: Game.time,
            transportDistance: nearestRepository ? nearestRepository.distance : null,
            repositoryId: nearestRepository ? nearestRepository.repository.id : null
        };
        Memory.sourceMetrics[source.id] = metrics;
    }
    return metrics;
}
exports.getSourceMetrics = getSourceMetrics;
function getMetrics(sourceId) {
    Memory.sourceMetrics = Memory.sourceMetrics || {};
    return Memory.sourceMetrics[sourceId];
}
function findNearestRepository(source) {
    return util.sortBy(findRepositories(source), o => o.distance)[0];
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
            const routeResult = Game.map.findRoute(source.room, room, { routeCallback: map.routeCallback });
            // if there's no route between the rooms, we can't use repositories in this room
            if (util.isNumber(routeResult))
                continue;
            route = routeResult;
        }
        const repositories = findRepositoriesInRoom(room);
        for (let j in repositories) {
            const repository = repositories[j];
            const distance = map.measurePathDistanceByRoute(source.pos, repository.pos, route);
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
    const nearbyRepositories = util.filter(repositories, o => o.distance <= 2);
    const sortedRepositories = util.sortBy(nearbyRepositories, o => o.distance);
    for (let i in sortedRepositories) {
        const info = sortedRepositories[i];
        if (roomNames.indexOf(info.repository.room.name) === -1) {
            roomNames.push(info.repository.room.name);
        }
    }
    return roomNames;
}
function findRepositoriesInRoom(room) {
    return room.find(FIND_MY_STRUCTURES, {
        filter: o => util.isLink(o) || util.isSpawn(o)
    });
}
//# sourceMappingURL=manager.sources.js.map