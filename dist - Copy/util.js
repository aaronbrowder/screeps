function getBestValue(valueData) {
    var best = null;
    var bestValue = -10000;
    for (let i in valueData) {
        const item = valueData[i];
        if (item.value > bestValue) {
            bestValue = item.value;
            best = item.target;
        }
    }
    return best;
}

function setMoveTarget(creep, target, desiredDistance) {
    creep.memory.moveTargetId = target ? target.id : null;
    creep.memory.moveTargetDesiredDistance = desiredDistance;
    if (target) {
        creep.moveTo(target, { visualizePathStyle: { stroke: '#fff' }});
    }
}

function isAtMoveTarget(creep) {
    const moveTarget = Game.getObjectById(creep.memory.moveTargetId);
    return moveTarget && (creep.pos === moveTarget.pos || creep.pos.inRangeTo(moveTarget.pos, creep.memory.moveTargetDesiredDistance || 1));
}

function moveToMoveTarget(creep) {
    const moveTarget = Game.getObjectById(creep.memory.moveTargetId);
    if (moveTarget) {
        if (isAtMoveTarget(creep)) {
            setMoveTarget(creep, null);
        } else {
            var isWorker = isCreepWorker(creep);
            creep.moveTo(moveTarget, { 
                visualizePathStyle: { stroke: '#fff' },
                //ignoreCreeps: isWorker,
                reusePath: isWorker ? 25 : 5
            });
            return true;
        }
    } else {
        setMoveTarget(creep, null);
    }
    return false;
}

function isCreepWorker(creep) {
    var role = creep.memory.role;
    return role === 'harvester' || role === 'transporter' || role === 'builder' || role === 'claimer';
}

function findNearestObject(pos, findType, filter) {
    return pos.findClosestByRange(findType, { filter: filter });
}

function findNearestStructure(pos, type, maxRange) {
    return findNearestObject(pos, FIND_STRUCTURES, function(structure) {
        return structure.structureType == type && (!maxRange || structure.pos.inRangeTo(pos, maxRange));
    });
}

function transferTo(creep, target) {
    for (const resource in creep.carry) {
        if (creep.carry[resource] > 0) {
            var transferResult = creep.transfer(target, resource);
            if (transferResult == ERR_NOT_IN_RANGE) {
                setMoveTarget(creep, target, 1);
            }
            else if (transferResult === OK && (target.structureType === STRUCTURE_EXTENSION || target.structureType === STRUCTURE_SPAWN)) {
                refreshSpawn(target.room.name);
            }
            return true;
        }
    }
    return false;
}

function deliverToSpawn(creep, spawn) {
    if (spawn.energy < spawn.energyCapacity) {
        transferTo(creep, spawn);
        return true;
    }
    const extensions = spawn.room.find(FIND_STRUCTURES, { filter: o => o.structureType == STRUCTURE_EXTENSION && o.energy < o.energyCapacity });
    if (extensions.length) {
        transferTo(creep, extensions[0]);
        return true;
    }
    return false;
}

function goToRecycle(creep) {
    var homeRoom = Game.rooms[creep.memory.homeRoomName];
    const spawn = homeRoom.find(FIND_MY_SPAWNS)[0];
    if (spawn) {
        setMoveTarget(creep, spawn);
        spawn.recycleCreep(creep);
        return true;
    }
    return false;
}

// function moveAwayFromDanger(creep, dangerDirections) {
//     const preferredDirections = { '1': 0, '2' :0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0 };
//     for (let i in dangerDirections) {
//         const awayDirections = getAwayDirections(dangerDirections[i]);
//         for (let j in awayDirections) {
//             preferredDirections[awayDirections[j]] = preferredDirections[awayDirections[j]] + 1;
//         }
//     }
//     var bestDir;
//     var bestCount = 0;
//     for (let dir in preferredDirections) {
//         const count = preferredDirections[dir];
//         console.log('creep: ' + creep);
//         if (count >= bestCount && isPosWalkable(getPosInDirection(creep.room, creep.pos, Number(dir)))) {
//             bestCount = count;
//             bestDir = Number(dir);
//         }
//     }
//     if (bestDir !== undefined) {
//         creep.move(bestDir);
//         return true;
//     }
//     return false;
// }

function isPosWalkable(pos) {
    if (Game.map.getTerrainAt(pos) ===  'wall') return false;
    if (pos.look().map(o => o.type).some(o => OBSTACLE_OBJECT_TYPES.includes(o))) return false;
    return true;
}

// function getAwayDirections(direction) {
//     switch (direction) {
//         case TOP: return [BOTTOM_LEFT, BOTTOM, BOTTOM_RIGHT];
//         case TOP_RIGHT: return [LEFT, BOTTOM_LEFT, BOTTOM];
//         case RIGHT: return [TOP_LEFT, LEFT, BOTTOM_LEFT];
//         case BOTTOM_RIGHT: return [TOP, TOP_LEFT, LEFT];
//         case BOTTOM: return [TOP_LEFT, TOP, TOP_RIGHT];
//         case BOTTOM_LEFT: return [RIGHT, TOP_RIGHT, TOP];
//         case LEFT: return [TOP_RIGHT, RIGHT, BOTTOM_RIGHT];
//         case TOP_LEFT: return [RIGHT, BOTTOM_RIGHT, BOTTOM];
//         default: console.log('unrecognized direction: ' + direction); break;
//     }
// }

// function getAdjacentDirections(direction) {
//     switch (direction) {
//         case TOP: return [TOP_LEFT, TOP_RIGHT];
//         case TOP_RIGHT: return [TOP, RIGHT];
//         case RIGHT: return [TOP_RIGHT, BOTTOM_RIGHT];
//         case BOTTOM_RIGHT: return [RIGHT, BOTTOM];
//         case BOTTOM: return [BOTTOM_RIGHT, BOTTOM_LEFT];
//         case BOTTOM_LEFT: return [LEFT, BOTTOM];
//         case LEFT: return [BOTTOM_LEFT, TOP_LEFT];
//         case TOP_LEFT: return [LEFT, TOP];
//         default: console.log('unrecognized direction: ' + direction); break;
//     }
// }

// function getOppositeDirections(direction) {
//     switch (direction) {
//         case TOP: return BOTTOM;
//         case TOP_RIGHT: return BOTTOM_LEFT;
//         case RIGHT: return LEFT;
//         case BOTTOM_RIGHT: return TOP_LEFT;
//         case BOTTOM: return TOP;
//         case BOTTOM_LEFT: return TOP_RIGHT;
//         case LEFT: return RIGHT;
//         case TOP_LEFT: return BOTTOM_RIGHT;
//         default: console.log('unrecognized direction: ' + direction); break;
//     }
// }

// function getPosInDirection(room, pos, direction) {
//     switch (direction) {
//         case TOP: return room.getPositionAt(pos.x, pos.y - 1);
//         case TOP_RIGHT: return room.getPositionAt(pos.x + 1, pos.y - 1);
//         case RIGHT: return room.getPositionAt(pos.x + 1, pos.y);
//         case BOTTOM_RIGHT: return room.getPositionAt(pos.x + 1, pos.y + 1);
//         case BOTTOM: return room.getPositionAt(pos.x, pos.y + 1); break;
//         case BOTTOM_LEFT: return room.getPositionAt(pos.x - 1, pos.y + 1);
//         case LEFT: return room.getPositionAt(pos.x - 1, pos.y); 
//         case TOP_LEFT: return room.getPositionAt(pos.x - 1, pos.y - 1);
//         default: console.log('unrecognized direction: ' + direction); break;
//     }
// }

function countCreeps(role, filter) {
    var count = 0;
    for (var i in Game.creeps) {
        if ((!role || Game.creeps[i].memory.role === role) && (!filter || filter(Game.creeps[i]))) count++;
    }
    return count;
}

function isWartime(room) {
    var hostiles = room.find(FIND_HOSTILE_CREEPS, { filter: o => o.body.some(p => p.type == ATTACK || p.type == RANGED_ATTACK) });
    return !!hostiles.length;
}

function refreshSpawn(roomName) {
    var roomMemory = Memory.rooms[roomName] || {};
    roomMemory.doRefreshSpawn = true;
    Memory.rooms[roomName] = roomMemory;
}

module.exports = {
    getBestValue: getBestValue,
    setMoveTarget: setMoveTarget,
    isAtMoveTarget: isAtMoveTarget,
    moveToMoveTarget: moveToMoveTarget,
    findNearestStructure: findNearestStructure,
    transferTo: transferTo,
    deliverToSpawn: deliverToSpawn,
    goToRecycle: goToRecycle,
    countCreeps: countCreeps,
    isWartime: isWartime,
    refreshSpawn: refreshSpawn
};