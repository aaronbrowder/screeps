import * as util from './util';
import * as rooms from './rooms';
import * as potencyUtil from './util.potency';
import * as idealsManager from './spawn.ideals';

const harvesterMovePartsPerWorkPart = 0.33;
const harvesterExtraCarryPartsPerWorkPart = 0.1;
const transporterMovePartsPerCarryPart = 0.5;
const builderCarryPartsPerWorkPart = 0.75;
const builderMovePartsPerWorkPart = 0.5;

const ravagerRangedAttackPartsPerAttackPart = 1;
const ravagerToughPartsPerAttackPart = 1;
const ravagerMovePartsPerAttackPart = 1.5;

export interface BodyResult {
    body: BodyPartConstant[];
    potency: number;
}

export function generateBody(desiredPotency: number, spawnRoom: Room, assignedRoomName: string,
    role: string, subRole?: string, assignmentId?: string): BodyResult {

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

function generateHarvesterBody(desiredPotency: number, spawnRoom: Room, assignedRoomName: string, assignmentId: string): BodyResult {

    const doClaim = rooms.getDirective(assignedRoomName) === rooms.DIRECTIVE_CLAIM;

    const maxPotency = Math.floor((spawnRoom.energyCapacityAvailable - 50) /
        (100 + (50 * harvesterMovePartsPerWorkPart) + (50 * harvesterExtraCarryPartsPerWorkPart)))
        - (doClaim ? 0 : 1)

    var potency = Math.min(desiredPotency || 1, maxPotency);

    if (potency < maxPotency) {
        // There's no reason for us to ever have more than one harvester that is smaller than the maximum size.
        // If there are two that are smaller than the maximum size, we can always replace them with a bigger one
        // and an even smaller one, with the hope that the smaller one would be zero and would reduce the total
        // number of harvesters we're supporting. Fewer harvesters means less traffic and less CPU. If the
        // max potency per harvester is >= the ideal potency, we can get by with just one harvester (which is ideal).
        const activeHarvesters = potencyUtil.getActiveCreeps(assignedRoomName, 'harvester', undefined, assignmentId);
        const sourceOrMineral: Source | Mineral = Game.getObjectById(assignmentId);
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
        if (potency > 3) moveParts++;
    }

    var body: BodyPartConstant[] = [CARRY];
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

function generateTransporterBody(desiredPotency: number, spawnRoom: Room, assignedRoomName: string): BodyResult {

    const doClaim = rooms.getDirective(assignedRoomName) === rooms.DIRECTIVE_CLAIM;

    var maxPotency = Math.floor(spawnRoom.energyCapacityAvailable / (50 + (50 * transporterMovePartsPerCarryPart)));
    maxPotency = Math.min(doClaim ? 9 : 24, maxPotency);

    var potency = Math.min(desiredPotency || 1, maxPotency);

    if (potency < maxPotency) {
        const activeTransporters = potencyUtil.getActiveCreeps(assignedRoomName, 'transporter');
        const ideals = idealsManager.getIdeals(assignedRoomName);
        var smallTransportersCount = _.filter(activeTransporters, o => potencyUtil.getCreepPotency(o) < maxPotency).length;
        if (maxPotency >= ideals.transporterPotency || smallTransportersCount > 0) {
            potency = Math.min(maxPotency, ideals.transporterPotency);
        }
    }

    const moveParts = Math.max(1, Math.ceil(potency * transporterMovePartsPerCarryPart));

    var body: BodyPartConstant[] = [];
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

function generateHubBody(desiredPotency: number): BodyResult {
    const potency = desiredPotency;
    var body: BodyPartConstant[] = [];
    for (let i = 0; i < potency; i++) {
        body = body.concat([CARRY]);
    }
    return {
        body: body,
        potency: potency
    };
}

function generateBuilderBody(desiredPotency: number, spawnRoom: Room,
    assignedRoomName: string, subRole: string): BodyResult {

    const doClaim = rooms.getDirective(assignedRoomName) === rooms.DIRECTIVE_CLAIM;

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
        if (potency > 3) moveParts++;
    }

    var body: BodyPartConstant[] = [];
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

function generateClaimerBody(desiredPotency: number, spawnRoom: Room): BodyResult {
    var potency = 0;
    var body: BodyPartConstant[] = [];
    var energyCost = 0;
    for (let i = 0; i < desiredPotency; i++) {
        energyCost += 650;
        if (spawnRoom.energyCapacityAvailable < energyCost) break;
        potency++;
        body = body.concat([CLAIM, MOVE]);
    }
    return {
        body: body,
        potency: potency
    };
}

function generateScoutBody(): BodyResult {
    return {
        body: [MOVE],
        potency: 1
    };
}

function generateRavagerBody(desiredPotency: number, spawnRoom: Room): BodyResult {

    const maxPotency = Math.floor(spawnRoom.energyCapacityAvailable / (80 +
        (150 * ravagerRangedAttackPartsPerAttackPart) +
        (10 * ravagerToughPartsPerAttackPart) +
        (50 * ravagerMovePartsPerAttackPart)));

    const potency = Math.min(desiredPotency || 1, maxPotency);

    var attackParts = potency;
    var rangedAttackParts = Math.floor(potency * ravagerRangedAttackPartsPerAttackPart);
    var toughParts = Math.floor(potency * ravagerToughPartsPerAttackPart);
    var moveParts = Math.max(1, Math.floor(potency * ravagerMovePartsPerAttackPart));

    var body: BodyPartConstant[] = [];

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

export function getEnergyCost(body: string[]) {
    return (util.countBodyParts(body, WORK) * 100)
        + (util.countBodyParts(body, CARRY) * 50)
        + (util.countBodyParts(body, MOVE) * 50)
        + (util.countBodyParts(body, CLAIM) * 600)
        + (util.countBodyParts(body, ATTACK) * 80)
        + (util.countBodyParts(body, RANGED_ATTACK) * 150)
        + (util.countBodyParts(body, TOUGH) * 10)
        + (util.countBodyParts(body, HEAL) * 250);
}

export function getTimeCost(body: string[]): number {
    return body.length * 3;
}

export function getUnladenSpeedOnRoads(body: string[]): number {
    const moveParts = util.countBodyParts(body, MOVE);
    const carryParts = util.countBodyParts(body, CARRY);
    const heavyParts = body.length - moveParts - carryParts;
    return Math.min(1, 2 * moveParts / heavyParts);
}

export function getRavagerMoveSpeed() {
    const fatigueGeneratingParts = 1 + ravagerRangedAttackPartsPerAttackPart + ravagerToughPartsPerAttackPart;
    return Math.min(1, ravagerMovePartsPerAttackPart / fatigueGeneratingParts);
}

export function getRavagerSpawnTimePerPotency() {
    return 3 * (1 + ravagerRangedAttackPartsPerAttackPart + ravagerToughPartsPerAttackPart + ravagerMovePartsPerAttackPart);
}

export function getRavagerSpawnEnergyPerPotency() {
    return 80 + (150 * ravagerRangedAttackPartsPerAttackPart) + (10 * ravagerToughPartsPerAttackPart) + (50 * ravagerMovePartsPerAttackPart);
}