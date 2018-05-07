
function runDefenseSystems() {
    for (const i in Game.structures) {
        const structure = Game.structures[i];
        if (structure.structureType == STRUCTURE_CONTROLLER) {
            runAlarmSystem(structure.room);
        }
    }
}

function runAlarmSystem(room) {
    if (!room.controller.safeMode && !!room.controller.safeModeAvailable && detectDangerousCreeps(room) && detectWallBreach(room)) {
        console.log('WALL BREACH!');
        room.controller.activateSafeMode();
    }
}

function detectDangerousCreeps(room) {
    return !!room.find(FIND_HOSTILE_CREEPS, { filter: o => o.body.some(p => p.type == ATTACK || p.type == RANGED_ATTACK) }).length;
}

function detectWallBreach(room) {
    const walls = room.find(FIND_STRUCTURES, { filter: function(structure) {
        return structure.structureType == STRUCTURE_WALL || structure.structureType == STRUCTURE_RAMPART;
    }});
    for (let i = 0; i < walls.length; i++) {
        const wallPos = walls[i].pos;
        let surroundingObstructions = 0;
        if (isObstructionAt(wallPos.x + 1, wallPos.y)) surroundingObstructions++;
        if (isObstructionAt(wallPos.x - 1, wallPos.y)) surroundingObstructions++;
        if (isObstructionAt(wallPos.x, wallPos.y + 1)) surroundingObstructions++;
        if (isObstructionAt(wallPos.x, wallPos.y - 1)) surroundingObstructions++;
        if (surroundingObstructions < 2) return true;
    }
    return false;
    function isObstructionAt(x, y) {
        const wallsFound = _.filter(room.lookForAt(LOOK_STRUCTURES, x, y), function(structure) {
            return structure.structureType == STRUCTURE_WALL || structure.structureType == STRUCTURE_RAMPART;
        });
        return wallsFound.length || Game.map.getTerrainAt(x, y, room.name) === 'wall';
    }
}

module.exports = {
    runDefenseSystems: runDefenseSystems,
    detectWallBreach: detectWallBreach
};