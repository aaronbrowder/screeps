import * as util from './util';
import * as rooms from './rooms';
import { benchmark } from './util.benchmarking';

export type Route = {
    exit: ExitConstant;
    room: string;
}[];

export function navigateToRoom(creep: Creep, targetRoomName: string, waitOutside?: boolean): boolean {
    const flag = rooms.getFlag(targetRoomName);
    if (!flag) return false;
    util.setMoveTargetFlag(creep, flag, 100);
    return true;
}

export function measurePathDistance(pointA: RoomPosition, pointB: RoomPosition): number {
    var route: Route = null;
    if (pointA.roomName !== pointB.roomName) {
        const routeResult = Game.map.findRoute(pointA.roomName, pointB.roomName, { routeCallback: routeCallback });
        // if there's no route between the rooms, pathfinding fails
        if (util.isNumber(routeResult)) return null;
        route = routeResult;
    }
    return measurePathDistanceByRoute(pointA, pointB, route);
}

export function measurePathDistanceByRoute(pointA: RoomPosition, pointB: RoomPosition, route: Route): number {
    var path: PathStep[];
    var exit: RoomPosition;
    var startPos = pointA;
    var distance = 0;
    if (route && route.length) {
        for (let i in route) {
            const routePart = route[i];
            if (!startPos) {
                // we don't have eyes in this room. just guess at the distance to traverse it.
                exit = null;
                path = null;
                distance += 30;
            } else {
                // measure the distance from the start position to the room exit
                try {
                    const opts = { ignoreCreeps: true } as any;
                    exit = startPos.findClosestByPath<ExitConstant>(routePart.exit, opts);
                    path = startPos.findPathTo(exit, { ignoreCreeps: true });
                    if (path && path.length) distance += path.length;
                    else return -1;
                }
                catch (error) {
                    const message = error + '. Could not calculate path from ' + pointA + ' to ' + pointB;
                    //Game.notify(message);
                    console.log(message);
                    return -1;
                }
            }
            // the next start pos is in the next room with the exit inverted
            startPos = getEntrancePosition(Game.rooms[routePart.room], routePart.exit, exit);
        }
    }
    // We are in the final room now. Measure the distance from the start position to the destination.
    if (startPos) {
        path = startPos.findPathTo(pointB, { ignoreCreeps: true });
        if (path && path.length) distance += path.length;
    } else {
        // we don't have eyes in this room. just guess at the distance to traverse it.
        distance += 30;
    }
    return distance;
}

function getEntrancePosition(room: Room, otherExit: ExitConstant, otherExitPos: RoomPosition): RoomPosition {
    if (!room) return null;
    // in case otherExit is not available, just pick a random exit position
    const someExitPos = room.find(otherExit)[0];
    if (!otherExitPos && !someExitPos) return null;
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

export function routeCallback(roomName: string, fromRoomName: string): number {
    const room = Game.rooms[roomName];
    // highways are fine to use
    const parsed: any = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
    const isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
    if (isHighway) return 1;
    // it's not ideal to use a room if we don't know what's in there
    if (!room) return 3;
    const ctrl = room.controller;
    if (ctrl) {
        var username = _.find(Game.structures).owner.username;
        // avoid rooms owned by other players
        if (ctrl.owner && !ctrl.my) return Infinity;
        // prefer rooms owned or reserved by me
        if (ctrl.my || (ctrl.reservation && ctrl.reservation.username === username)) return 1;
    }
    // the room is owned by no one
    return 2;
}