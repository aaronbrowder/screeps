import * as util from './util';
import * as enums from './enums';
import * as rooms from './rooms';
import * as idealsManager from './spawn.ideals';
import * as bodies from './spawn.bodies';

export function generateBody(desiredPotency: number,
    spawnRoom: Room,
    assignedRoomName: string,
    role: RoleConstant,
    subRole?: SubRoleConstant,
    assignmentId?: string): bodies.BodyResult {

    const bodyType = bodies.getBodyTypeFromRole(role, subRole);
    const d = bodies.getDefinition(bodyType);
    const isRemote = assignedRoomName !== spawnRoom.name;

    if (!d) throw 'Can\'t find a body definition for role ' + role + ' and sub-role ' + subRole;

    switch (bodyType) {
        case (enums.HARVESTER):
            return generateHarvesterBody(desiredPotency, spawnRoom, assignedRoomName, assignmentId);
        case (enums.TRANSPORTER):
            return generateTransporterBody(desiredPotency, spawnRoom, assignedRoomName);
        case (enums.BUILDER):
            return generateBuilderBody(desiredPotency, spawnRoom, assignedRoomName);
        case (enums.HUB):
            return generateBodyInternal(desiredPotency, spawnRoom, d, isRemote);
        default:
            return generateBodyInternal(desiredPotency, spawnRoom, d, isRemote);
    }
}

function generateHarvesterBody(desiredPotency: number, spawnRoom: Room, assignedRoomName: string, assignmentId: string): bodies.BodyResult {
    const d = bodies.getDefinition(enums.HARVESTER);
    const isRemote = assignedRoomName !== spawnRoom.name;
    const maxPotency = bodies.getMaxPotency(d, spawnRoom, isRemote);
    var potency = Math.min(desiredPotency || 1, maxPotency);
    if (potency < maxPotency) {
        // There's no reason for us to ever have more than one harvester that is smaller than the maximum size.
        // If there are two that are smaller than the maximum size, we can always replace them with a bigger one
        // and an even smaller one, with the hope that the smaller one would be zero and would reduce the total
        // number of harvesters we're supporting. Fewer harvesters means less traffic and less CPU. If the
        // max potency per harvester is >= the ideal potency, we can get by with just one harvester (which is ideal).
        const activeHarvesters = bodies.getActiveCreeps(assignedRoomName, enums.HARVESTER, undefined, assignmentId);
        const sourceOrMineral: Source | Mineral = Game.getObjectById(assignmentId);
        const ideals = idealsManager.getIdeals(assignedRoomName);

        const idealPotency = util.isSource(sourceOrMineral)
            ? ideals.harvesterPotencyPerSource
            : ideals.harvesterPotencyPerMineral;

        var smallHarvestersCount = util.filter(activeHarvesters, o => bodies.measurePotency(o) < maxPotency).length;
        if (maxPotency >= idealPotency || smallHarvestersCount > 0) {
            potency = Math.min(maxPotency, idealPotency);
        }
    }
    return generateBodyInternal(potency, spawnRoom, d, isRemote);
}

function generateTransporterBody(desiredPotency: number, spawnRoom: Room, assignedRoomName: string): bodies.BodyResult {
    const d = bodies.getDefinition(enums.TRANSPORTER);
    const isRemote = assignedRoomName !== spawnRoom.name;
    var maxPotency = bodies.getMaxPotency(d, spawnRoom, isRemote);
    // we want to limit the size of transporters so that we always have multiple transporters even at high
    // controller levels (so we can accomplish multiple assignemnts simultaneously)
    maxPotency = Math.min(isRemote ? 24 : 7, maxPotency);
    var potency = Math.min(desiredPotency || 1, maxPotency);
    // try to minimize the number of transporters to save CPU (see comment above in harvester function)
    if (potency < maxPotency) {
        const activeTransporters = bodies.getActiveCreeps(assignedRoomName, enums.TRANSPORTER);
        const ideals = idealsManager.getIdeals(assignedRoomName);
        var smallTransportersCount = util.filter(activeTransporters, o => bodies.measurePotency(o) < maxPotency).length;
        if (maxPotency >= ideals.transporterPotency || smallTransportersCount > 0) {
            potency = Math.min(maxPotency, ideals.transporterPotency);
        }
    }
    return generateBodyInternal(potency, spawnRoom, d, isRemote);
}

function generateBuilderBody(desiredPotency: number, spawnRoom: Room, assignedRoomName: string): bodies.BodyResult {
    const d = bodies.getDefinition(enums.BUILDER);
    const isRemote = assignedRoomName !== spawnRoom.name;
    var maxPotency = bodies.getMaxPotency(d, spawnRoom, isRemote);
    // in claimed rooms, we always want to have at least two builders so they can work on different tasks
    const ideals = idealsManager.getIdeals(assignedRoomName);
    const maxPotencyPerBuilder = isRemote ? ideals.builderPotency : Math.ceil(ideals.builderPotency / 2);
    maxPotency = Math.min(maxPotencyPerBuilder, maxPotency);
    var potency = Math.min(desiredPotency || 1, maxPotency);
    // try to minimize the number of builders to save CPU (see comment above in harvester function)
    if (potency < maxPotency) {
        const activeBuilders = bodies.getActiveCreeps(assignedRoomName, enums.BUILDER);
        const smallBuildersCount = util.filter(activeBuilders, o => bodies.measurePotency(o) < maxPotency).length;
        if (maxPotency >= ideals.builderPotency || smallBuildersCount > 0) {
            potency = Math.min(maxPotency, ideals.builderPotency);
        }
    }
    return generateBodyInternal(potency, spawnRoom, d, isRemote);
}

function generateBodyInternal(desiredPotency: number, spawnRoom: Room, d: bodies.BodyDefinition, isRemote: boolean): bodies.BodyResult {

    const maxPotency = bodies.getMaxPotency(d, spawnRoom, isRemote);
    const potency = Math.min(desiredPotency || 1, maxPotency);

    const move = isRemote && d.remoteMove ? d.remoteMove : d.move;

    // note that move uses ceil() while everything else uses floor()
    var moveParts = Math.ceil(potency * move);
    var workParts = Math.floor(potency * d.work);
    var carryParts = Math.floor(potency * d.carry);
    var attackParts = Math.floor(potency * d.attack);
    var rangedAttackParts = Math.floor(potency * d.rangedAttack);
    var toughParts = Math.floor(potency * d.tough);
    var healParts = Math.floor(potency * d.heal);
    var claimParts = Math.floor(potency * d.claim);

    // creeps that need to carry things need to have at least 1 carry part
    if (d.carry > 0 && carryParts === 0) {
        carryParts = 1;
    }

    var body: BodyPartConstant[] = [];

    while (toughParts > 0) {
        body = body.concat([TOUGH]);
        toughParts--;
    }
    while (workParts > 0) {
        body = body.concat([WORK]);
        workParts--;
    }
    while (carryParts > 0) {
        body = body.concat([CARRY]);
        carryParts--;
    }
    while (claimParts > 0) {
        body = body.concat([CLAIM]);
        claimParts--;
    }
    while (attackParts > 0) {
        body = body.concat([ATTACK]);
        attackParts--;
    }
    while (rangedAttackParts > 0) {
        body = body.concat([RANGED_ATTACK]);
        rangedAttackParts--;
    }
    while (moveParts > 0) {
        body = body.concat([MOVE]);
        moveParts--;
    }
    while (healParts > 0) {
        body = body.concat([HEAL]);
        healParts--;
    }
    return {
        body: body,
        potency: potency
    };
}