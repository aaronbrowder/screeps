"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const rooms = require("./rooms");
const potencyUtil = require("./util.potency");
const idealsManager = require("./manager.spawn.ideals");
const harvesterMovePartsPerWorkPart = 0.33;
const harvesterExtraCarryPartsPerWorkPart = 0.1;
const transporterMovePartsPerCarryPart = 0.5;
const builderCarryPartsPerWorkPart = 0.75;
const builderMovePartsPerWorkPart = 0.5;
const ravagerRangedAttackPartsPerAttackPart = 1;
const ravagerToughPartsPerAttackPart = 1;
const ravagerMovePartsPerAttackPart = 1.5;
function generateBody(desiredPotency, spawnRoom, assignedRoomName, role, subRole, assignmentId) {
    switch (role) {
        case 'harvester': return generateHarvesterBody(desiredPotency, spawnRoom, assignedRoomName, assignmentId);
        case 'transporter': return generateTransporterBody(desiredPotency, spawnRoom, assignedRoomName);
        case 'hub': return generateHubBody(desiredPotency);
        case 'builder': return generateBuilderBody(desiredPotency, spawnRoom, assignedRoomName, subRole);
        case 'claimer': return generateClaimerBody(desiredPotency, spawnRoom);
        case 'scout': return generateScoutBody();
        case 'ravager': return generateRavagerBody(desiredPotency, spawnRoom);
        default: return null;
    }
}
exports.generateBody = generateBody;
function generateHarvesterBody(desiredPotency, spawnRoom, assignedRoomName, assignmentId) {
    const doClaim = rooms.getDoClaim(assignedRoomName);
    const maxPotency = Math.floor((spawnRoom.energyCapacityAvailable - 50) /
        (100 + (50 * harvesterMovePartsPerWorkPart) + (50 * harvesterExtraCarryPartsPerWorkPart)))
        - (doClaim ? 0 : 1);
    var potency = Math.min(desiredPotency || 1, maxPotency);
    if (potency < maxPotency) {
        // There's no reason for us to ever have more than one harvester that is smaller than the maximum size.
        // If there are two that are smaller than the maximum size, we can always replace them with a bigger one
        // and an even smaller one, with the hope that the smaller one would be zero and would reduce the total
        // number of harvesters we're supporting. Fewer harvesters means less traffic and less CPU. If the
        // max potency per harvester is >= the ideal potency, we can get by with just one harvester (which is ideal).
        const activeHarvesters = potencyUtil.getActiveCreeps(assignedRoomName, 'harvester', undefined, assignmentId);
        const sourceOrMineral = Game.getObjectById(assignmentId);
        const ideals = idealsManager.getIdeals(assignedRoomName);
        const idealPotency = util.isSource(sourceOrMineral)
            ? ideals.harvesterPotencyPerSource
            : ideals.harvesterPotencyPerMineral;
        var smallHarvestersCount = _.filter(activeHarvesters, o => potencyUtil.getCreepPotency(o) < maxPotency).length;
        if (maxPotency >= idealPotency || smallHarvestersCount > 0) {
            potency = Math.min(maxPotency, idealPotency);
        }
    }
    var moveParts = Math.max(1, Math.floor(potency * harvesterMovePartsPerWorkPart));
    if (spawnRoom.name !== assignedRoomName) {
        moveParts++;
        if (potency > 3)
            moveParts++;
    }
    var body = [CARRY];
    if (potency >= 10) {
        body = body.concat([CARRY]);
    }
    for (let i = 0; i < potency; i++) {
        body = body.concat([WORK]);
    }
    for (let i = 0; i < moveParts; i++) {
        body = body.concat([MOVE]);
    }
    return {
        body: body,
        potency: potency
    };
}
function generateTransporterBody(desiredPotency, spawnRoom, assignedRoomName) {
    const doClaim = rooms.getDoClaim(assignedRoomName);
    var maxPotency = Math.floor(spawnRoom.energyCapacityAvailable / (50 + (50 * transporterMovePartsPerCarryPart)));
    maxPotency = Math.min(doClaim ? 5 : 24, maxPotency);
    var potency = Math.min(desiredPotency || 1, maxPotency);
    if (potency < maxPotency) {
        const activeTransporters = potencyUtil.getActiveCreeps(assignedRoomName, 'transporter');
        const ideals = idealsManager.getIdeals(assignedRoomName);
        var smallTransportersCount = _.filter(activeTransporters, o => potencyUtil.getCreepPotency(o) < maxPotency).length;
        if (maxPotency >= ideals.transporterPotency || smallTransportersCount > 0) {
            potency = Math.min(maxPotency, ideals.transporterPotency);
        }
    }
    const moveParts = Math.max(1, Math.floor(potency * transporterMovePartsPerCarryPart));
    var body = [];
    for (let i = 0; i < potency; i++) {
        body = body.concat([CARRY]);
    }
    for (let i = 0; i < moveParts; i++) {
        body = body.concat([MOVE]);
    }
    return {
        body: body,
        potency: potency
    };
}
function generateHubBody(desiredPotency) {
    const potency = desiredPotency;
    var body = [];
    for (let i = 0; i < potency; i++) {
        body = body.concat([CARRY]);
    }
    return {
        body: body,
        potency: potency
    };
}
function generateBuilderBody(desiredPotency, spawnRoom, assignedRoomName, subRole) {
    const doClaim = rooms.getDoClaim(assignedRoomName);
    var maxPotency = Math.floor(spawnRoom.energyCapacityAvailable /
        (100 + (50 * builderCarryPartsPerWorkPart) + (50 * builderMovePartsPerWorkPart)))
        - (doClaim ? 0 : 1);
    const ideals = idealsManager.getIdeals(assignedRoomName);
    const idealPotency = subRole === 'upgrader' ? ideals.upgraderPotency : ideals.wallBuilderPotency;
    // in claimed rooms, we always want to have two builders per subRole so they can work on different tasks
    const maxPotencyPerBuilder = doClaim ? Math.ceil(idealPotency / 2) : idealPotency;
    maxPotency = Math.min(maxPotencyPerBuilder, maxPotency);
    var potency = Math.min(desiredPotency || 1, maxPotency);
    if (potency < maxPotency) {
        const activeBuilders = potencyUtil.getActiveCreeps(assignedRoomName, 'builder', subRole);
        const smallBuildersCount = _.filter(activeBuilders, o => potencyUtil.getCreepPotency(o) < maxPotency).length;
        if (maxPotency >= idealPotency || smallBuildersCount > 0) {
            potency = Math.min(maxPotency, idealPotency);
        }
    }
    var carryParts = Math.max(1, Math.floor(potency * builderCarryPartsPerWorkPart));
    var moveParts = Math.max(1, Math.floor(potency * builderMovePartsPerWorkPart));
    if (spawnRoom.name !== assignedRoomName) {
        moveParts++;
        if (potency > 3)
            moveParts++;
    }
    var body = [];
    for (let i = 0; i < potency; i++) {
        body = body.concat([WORK]);
    }
    for (let i = 0; i < carryParts; i++) {
        body = body.concat([CARRY]);
    }
    for (let i = 0; i < moveParts; i++) {
        body = body.concat([MOVE]);
    }
    return {
        body: body,
        potency: potency
    };
}
function generateClaimerBody(desiredPotency, spawnRoom) {
    var potency = 0;
    var body = [];
    var energyCost = 0;
    for (let i = 0; i < desiredPotency; i++) {
        energyCost += 650;
        if (spawnRoom.energyCapacityAvailable < energyCost)
            break;
        potency++;
        body = body.concat([CLAIM, MOVE]);
    }
    return {
        body: body,
        potency: potency
    };
}
function generateScoutBody() {
    return {
        body: [MOVE],
        potency: 1
    };
}
function generateRavagerBody(desiredPotency, spawnRoom) {
    const maxPotency = Math.floor(spawnRoom.energyCapacityAvailable / (80 +
        (150 * ravagerRangedAttackPartsPerAttackPart) +
        (10 * ravagerToughPartsPerAttackPart) +
        (50 * ravagerMovePartsPerAttackPart)));
    const potency = Math.min(desiredPotency || 1, maxPotency);
    var attackParts = potency;
    var rangedAttackParts = Math.floor(potency * ravagerRangedAttackPartsPerAttackPart);
    var toughParts = Math.floor(potency * ravagerToughPartsPerAttackPart);
    var moveParts = Math.max(1, Math.floor(potency * ravagerMovePartsPerAttackPart));
    var body = [];
    while (attackParts > 0 || rangedAttackParts > 0 || toughParts > 0 || moveParts > 0) {
        if (toughParts > 0) {
            body = body.concat([TOUGH]);
            toughParts--;
        }
        if (attackParts > 0) {
            body = body.concat([ATTACK]);
            attackParts--;
        }
        if (rangedAttackParts > 0) {
            body = body.concat([RANGED_ATTACK]);
            rangedAttackParts--;
        }
        if (moveParts > 0) {
            body = body.concat([MOVE]);
            moveParts--;
        }
    }
    return {
        body: body,
        potency: potency
    };
}
function getEnergyCost(body) {
    return (util.countBodyParts(body, WORK) * 100)
        + (util.countBodyParts(body, CARRY) * 50)
        + (util.countBodyParts(body, MOVE) * 50)
        + (util.countBodyParts(body, CLAIM) * 600)
        + (util.countBodyParts(body, ATTACK) * 80)
        + (util.countBodyParts(body, RANGED_ATTACK) * 150)
        + (util.countBodyParts(body, TOUGH) * 10)
        + (util.countBodyParts(body, HEAL) * 250);
}
exports.getEnergyCost = getEnergyCost;
function getTimeCost(body) {
    return body.length * 3;
}
exports.getTimeCost = getTimeCost;
function getUnladenSpeedOnRoads(body) {
    const moveParts = util.countBodyParts(body, MOVE);
    const carryParts = util.countBodyParts(body, CARRY);
    const heavyParts = body.length - moveParts - carryParts;
    return Math.min(1, 2 * moveParts / heavyParts);
}
exports.getUnladenSpeedOnRoads = getUnladenSpeedOnRoads;
//# sourceMappingURL=manager.spawn.bodies.js.map