import * as util from './util';
import * as rooms from './rooms';
import * as potencyUtil from './util.potency';
import * as idealsManager from './manager.spawn.ideals';

const harvesterMovePartsPerWorkPart = 0.33;
const harvesterExtraCarryPartsPerWorkPart = 0.1;
const transporterMovePartsPerCarryPart = 0.5;
const builderCarryPartsPerWorkPart = 0.75;
const builderMovePartsPerWorkPart = 0.5;

export interface BodyResult {
    body: string[];
    potency: number;
    maxPotency: number;
}

export function generateHarvesterBody(desiredPotency: number, spawnRoom: Room,
    assignedRoomName: string, assignmentId: string): BodyResult {

    const doClaim = rooms.getDoClaim(assignedRoomName);

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

    var body: string[] = [CARRY];
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
        potency: potency,
        maxPotency: maxPotency
    };
}

export function generateTransporterBody(desiredPotency: number, spawnRoom: Room, assignedRoomName: string): BodyResult {

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

    var body: string[] = [];
    for (let i = 0; i < potency; i++) {
        body = body.concat([CARRY]);
    }
    for (let i = 0; i < moveParts; i++) {
        body = body.concat([MOVE]);
    }

    return {
        body: body,
        potency: potency,
        maxPotency: maxPotency
    };
}

export function generateHubBody(desiredPotency: number, spawnRoom: Room, assignedRoomName: string): BodyResult {
    const potency = desiredPotency;
    var body: string[] = [];
    for (let i = 0; i < potency; i++) {
        body = body.concat([CARRY]);
    }
    return {
        body: body,
        potency: potency,
        maxPotency: 10000
    };
}

export function generateBuilderBody(desiredPotency: number, spawnRoom: Room,
    assignedRoomName: string, subRole: string): BodyResult {

    const doClaim = rooms.getDoClaim(assignedRoomName);

    var maxPotency = Math.floor(spawnRoom.energyCapacityAvailable /
        (100 + (50 * builderCarryPartsPerWorkPart) + (50 * builderMovePartsPerWorkPart)))
        - (doClaim ? 0 : 1);

    maxPotency = Math.min(7, maxPotency);

    if (!_.filter(Game.creeps, o => o.memory.role === 'builder' && o.memory.assignedRoomName === assignedRoomName).length) {
        // do recovery mode
        maxPotency = 1;
    }

    var potency = Math.min(desiredPotency || 1, maxPotency);

    if (potency < maxPotency) {
        const activeBuilders = potencyUtil.getActiveCreeps(assignedRoomName, 'builder', subRole);
        const ideals = idealsManager.getIdeals(assignedRoomName);
        const idealPotency = subRole === 'upgrader' ? ideals.upgraderPotency : ideals.wallBuilderPotency;
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

    var body: string[] = [];
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
        potency: potency,
        maxPotency: maxPotency
    };
}

export function getEnergyCost(body: string[]) {
    return (util.countBodyParts(body, WORK) * 100)
        + (util.countBodyParts(body, CARRY) * 50)
        + (util.countBodyParts(body, MOVE) * 50)
        + (util.countBodyParts(body, CLAIM) * 600);
}

export function getTimeCost(body: string[]): number {
    return body.length * 3;
}