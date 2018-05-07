import * as util from './util';
import * as rooms from './rooms';

const harvesterMovePartsPerWorkPart = 0.33;
const harvesterExtraCarryPartsPerWorkPart = 0.1;
const transporterMovePartsPerCarryPart = 0.5;
const builderCarryPartsPerWorkPart = 0.75;
const builderMovePartsPerWorkPart = 0.5;

export interface BodyResult {
    body: string[];
    maxSize: number;
}

export function generateHarvesterBody(desiredWorkParts: number, spawnRoom: Room, assignedRoomName: string): BodyResult {

    const doClaim = rooms.getDoClaim(assignedRoomName);

    const maxWorkParts = Math.floor((spawnRoom.energyCapacityAvailable - 50) /
        (100 + (50 * harvesterMovePartsPerWorkPart) + (50 * harvesterExtraCarryPartsPerWorkPart)))
        - (doClaim ? 0 : 1)

    var workParts = Math.min(desiredWorkParts || 1, maxWorkParts);

    //if (workParts < maxWorkParts) {
    //    // there's no reason for us to ever have more than one harvester that is smaller than the maximum size.
    //    // if there are two that are smaller than the maximum size, we can always replace them with a bigger one
    //    // and an even smaller one, with the hope that the smaller one would be zero and would reduce the total
    //    // number of harvesters we're supporting. fewer harvesters means less traffic and less CPU.
    //    // if the max harvester size is greater than or equal to the ideal total size, we can get by with just
    //    // one harvester (which is ideal).
    //    var smallHarvestersCount = _.filter(assignedHarvesters, (o: Creep) => o.getActiveBodyparts(WORK) < maxHarvesterWorkParts).length;
    //    if (maxHarvesterWorkParts >= idealTotalWorkParts || smallHarvestersCount > 0) {
    //        workParts = Math.min(maxHarvesterWorkParts, idealTotalWorkParts);
    //    }
    //}

    var moveParts = Math.max(1, Math.floor(workParts * harvesterMovePartsPerWorkPart));
    if (spawnRoom.name !== assignedRoomName) {
        moveParts++;
        if (workParts > 3) moveParts++;
    }

    var body: string[] = [CARRY];
    if (workParts >= 10) {
        body = body.concat([CARRY]);
    }
    for (let i = 0; i < workParts; i++) {
        body = body.concat([WORK]);
    }
    for (let i = 0; i < moveParts; i++) {
        body = body.concat([MOVE]);
    }

    return {
        body: body,
        maxSize: maxWorkParts
    };
}

export function generateTransporterBody(desiredCarryParts: number, spawnRoom: Room, assignedRoomName: string): BodyResult {

    const doClaim = rooms.getDoClaim(assignedRoomName);

    var maxCarryParts = Math.floor(spawnRoom.energyCapacityAvailable / (50 + (50 * transporterMovePartsPerCarryPart)));
    maxCarryParts = Math.min(doClaim ? 5 : 24, maxCarryParts);

    var carryParts = Math.min(desiredCarryParts || 1, maxCarryParts);

    //if (carryParts < maxCarryParts) {
    //    var smallTransportersCount = _.filter(transporters, (o: Creep) => o.getActiveBodyparts(CARRY) < maxTransporterCarryParts).length;
    //    if (maxTransporterCarryParts >= idealCarryParts || smallTransportersCount > 0) {
    //        carryParts = Math.min(maxTransporterCarryParts, idealCarryParts);
    //    }
    //}

    const moveParts = Math.max(1, Math.floor(carryParts * transporterMovePartsPerCarryPart));

    var body: string[] = [];
    for (let i = 0; i < carryParts; i++) {
        body = body.concat([CARRY]);
    }
    for (let i = 0; i < moveParts; i++) {
        body = body.concat([MOVE]);
    }

    return {
        body: body,
        maxSize: maxCarryParts
    };
}

export function generateBuilderBody(desiredWorkParts: number, spawnRoom: Room, assignedRoomName: string): BodyResult {

    const doClaim = rooms.getDoClaim(assignedRoomName);

    var maxWorkParts = Math.floor(spawnRoom.energyCapacityAvailable /
        (100 + (50 * builderCarryPartsPerWorkPart) + (50 * builderMovePartsPerWorkPart)))
        - (doClaim ? 0 : 1);

    maxWorkParts = Math.min(7, maxWorkParts);

    if (!_.filter(Game.creeps, o => o.memory.role === 'builder' && o.memory.assignedRoomName === assignedRoomName).length) {
        // do recovery mode
        maxWorkParts = 1;
    }

    var workParts = Math.min(desiredWorkParts || 1, maxWorkParts);

    //if (workParts < maxWorkParts) {
    //    var smallBuildersCount = _.filter(builders, (o: Creep) => o.getActiveBodyparts(WORK) < maxBuilderWorkParts).length;
    //    if (maxBuilderWorkParts >= idealTotalWorkParts || smallBuildersCount > 0) {
    //        workParts = Math.min(maxBuilderWorkParts, idealTotalWorkParts);
    //    }
    //}

    var carryParts = Math.max(1, Math.floor(workParts * builderCarryPartsPerWorkPart));
    var moveParts = Math.max(1, Math.floor(workParts * builderMovePartsPerWorkPart));

    if (spawnRoom.name !== assignedRoomName) {
        moveParts++;
        if (workParts > 3) moveParts++;
    }

    var body: string[] = [];
    for (let i = 0; i < workParts; i++) {
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
        maxSize: maxWorkParts
    };
}

export function getEnergyCost(body: string[]) {
    return (util.countBodyParts(body, WORK) * 100)
        + (util.countBodyParts(body, CARRY) * 50)
        + (util.countBodyParts(body, MOVE) * 50)
        + (util.countBodyParts(body, CLAIM) * 600);
}