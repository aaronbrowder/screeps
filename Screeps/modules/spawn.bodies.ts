import * as util from './util';
import * as enums from './enums';
import * as rooms from './rooms';
import * as idealsManager from './spawn.ideals';

export interface BodyResult {
    body: BodyPartConstant[];
    potency: number;
}

interface BodyDefinition {
    // meter is the body part type used to measure the potency of the creep. its corresponding part should always equal 1.
    meter: BodyPartConstant;
    work: number;
    carry: number;
    attack: number;
    rangedAttack: number;
    tough: number;
    heal: number;
    claim: number;
    move?: number;
    // we may want extra move parts if assigned room is different from home room
    remoteMove?: number;
}

function getHarvesterDefinition(): BodyDefinition {
    return {
        meter: WORK,
        work: 1,
        carry: 0.2,
        move: 0.33,
        remoteMove: 0.66,
        attack: 0,
        rangedAttack: 0,
        tough: 0,
        heal: 0,
        claim: 0
    };
}

function getBuilderDefinition(): BodyDefinition {
    return {
        meter: WORK,
        work: 1,
        carry: 0.75,
        move: 0.5,
        attack: 0,
        rangedAttack: 0,
        tough: 0,
        heal: 0,
        claim: 0
    };
}

function getTransporterDefinition(): BodyDefinition {
    return {
        meter: CARRY,
        work: 0,
        carry: 1,
        move: 0.5,
        attack: 0,
        rangedAttack: 0,
        tough: 0,
        heal: 0,
        claim: 0
    };
}

function getScoutDefinition(): BodyDefinition {
    return {
        meter: MOVE,
        work: 0,
        carry: 0,
        move: 1,
        attack: 0,
        rangedAttack: 0,
        tough: 0,
        heal: 0,
        claim: 0
    };
}

function getHubDefinition(): BodyDefinition {
    return {
        meter: CARRY,
        work: 0,
        carry: 1,
        move: 0,
        attack: 0,
        rangedAttack: 0,
        tough: 0,
        heal: 0,
        claim: 0
    };
}

function getClaimerDefinition(): BodyDefinition {
    return {
        meter: CLAIM,
        work: 0,
        carry: 0,
        move: 1,
        attack: 0,
        rangedAttack: 0,
        tough: 0,
        heal: 0,
        claim: 1
    };
}

function getRavagerDefinition(): BodyDefinition {
    var d: BodyDefinition = {
        meter: ATTACK,
        work: 0,
        carry: 0,
        attack: 1,
        rangedAttack: 0.8,
        tough: 2,
        heal: 0,
        claim: 0
    }
    d.move = getMovePartsRequiredForSpeed(d, 0.5);
    return d;
}

function getSlayerDefinition(): BodyDefinition {
    var d: BodyDefinition = {
        meter: RANGED_ATTACK,
        work: 0,
        carry: 0,
        attack: 0,
        rangedAttack: 1,
        tough: 1.7,
        heal: 0.1,
        claim: 0
    }
    d.move = getMovePartsRequiredForSpeed(d, 0.5);
    return d;
}

function getDefenderDefinition(): BodyDefinition {
    return {
        meter: ATTACK,
        work: 0,
        carry: 0,
        move: 0.2,
        attack: 1,
        rangedAttack: 0,
        tough: 0,
        heal: 0,
        claim: 0
    }
}

function getDefinition(bodyType: BodyTypeConstant): BodyDefinition {
    switch (bodyType) {
        case enums.HARVESTER:
            return getHarvesterDefinition();
        case enums.TRANSPORTER:
            return getTransporterDefinition();
        case enums.BUILDER:
            return getBuilderDefinition();
        case enums.SCOUT:
            return getScoutDefinition();
        case enums.HUB:
            return getHubDefinition();
        case enums.CLAIMER:
            return getClaimerDefinition();
        case enums.RAVAGER:
            return getRavagerDefinition();
        case enums.SLAYER:
            return getSlayerDefinition();
        case enums.DEFENDER:
            return getDefenderDefinition();
    }
}

function getBodyTypeFromRole(role: RoleConstant, subRole?: SubRoleConstant): BodyTypeConstant {
    if (role === enums.COMBATANT) {
        return subRole;
    }
    return role;
}

export function generateBody(desiredPotency: number,
    spawnRoom: Room,
    assignedRoomName: string,
    role: RoleConstant,
    subRole?: SubRoleConstant,
    assignmentId?: string): BodyResult {

    const bodyType = getBodyTypeFromRole(role, subRole);
    const d = getDefinition(bodyType);
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

function generateHarvesterBody(desiredPotency: number, spawnRoom: Room, assignedRoomName: string, assignmentId: string): BodyResult {
    const d = getDefinition(enums.HARVESTER);
    const isRemote = assignedRoomName !== spawnRoom.name;
    const maxPotency = getMaxPotency(d, spawnRoom, isRemote);
    var potency = Math.min(desiredPotency || 1, maxPotency);
    if (potency < maxPotency) {
        // There's no reason for us to ever have more than one harvester that is smaller than the maximum size.
        // If there are two that are smaller than the maximum size, we can always replace them with a bigger one
        // and an even smaller one, with the hope that the smaller one would be zero and would reduce the total
        // number of harvesters we're supporting. Fewer harvesters means less traffic and less CPU. If the
        // max potency per harvester is >= the ideal potency, we can get by with just one harvester (which is ideal).
        const activeHarvesters = getActiveCreeps(assignedRoomName, enums.HARVESTER, undefined, assignmentId);
        const sourceOrMineral: Source | Mineral = Game.getObjectById(assignmentId);
        const ideals = idealsManager.getIdeals(assignedRoomName);

        const idealPotency = util.isSource(sourceOrMineral)
            ? ideals.harvesterPotencyPerSource
            : ideals.harvesterPotencyPerMineral;

        var smallHarvestersCount = util.filter(activeHarvesters, o => measurePotency(o) < maxPotency).length;
        if (maxPotency >= idealPotency || smallHarvestersCount > 0) {
            potency = Math.min(maxPotency, idealPotency);
        }
    }
    return generateBodyInternal(potency, spawnRoom, d, isRemote);
}

function generateTransporterBody(desiredPotency: number, spawnRoom: Room, assignedRoomName: string): BodyResult {
    const d = getDefinition(enums.TRANSPORTER);
    const isRemote = assignedRoomName !== spawnRoom.name;
    var maxPotency = getMaxPotency(d, spawnRoom, isRemote);
    // we want to limit the size of transporters so that we always have multiple transporters even at high
    // controller levels (so we can accomplish multiple assignemnts simultaneously)
    maxPotency = Math.min(isRemote ? 24 : 7, maxPotency);
    var potency = Math.min(desiredPotency || 1, maxPotency);
    // try to minimize the number of transporters to save CPU (see comment above in harvester function)
    if (potency < maxPotency) {
        const activeTransporters = getActiveCreeps(assignedRoomName, enums.TRANSPORTER);
        const ideals = idealsManager.getIdeals(assignedRoomName);
        var smallTransportersCount = util.filter(activeTransporters, o => measurePotency(o) < maxPotency).length;
        if (maxPotency >= ideals.transporterPotency || smallTransportersCount > 0) {
            potency = Math.min(maxPotency, ideals.transporterPotency);
        }
    }
    return generateBodyInternal(potency, spawnRoom, d, isRemote);
}

function generateBuilderBody(desiredPotency: number, spawnRoom: Room, assignedRoomName: string): BodyResult {
    const d = getDefinition(enums.BUILDER);
    const isRemote = assignedRoomName !== spawnRoom.name;
    var maxPotency = getMaxPotency(d, spawnRoom, isRemote);
    // in claimed rooms, we always want to have at least two builders so they can work on different tasks
    const ideals = idealsManager.getIdeals(assignedRoomName);
    const maxPotencyPerBuilder = isRemote ? ideals.builderPotency : Math.ceil(ideals.builderPotency / 2);
    maxPotency = Math.min(maxPotencyPerBuilder, maxPotency);
    var potency = Math.min(desiredPotency || 1, maxPotency);
    // try to minimize the number of builders to save CPU (see comment above in harvester function)
    if (potency < maxPotency) {
        const activeBuilders = getActiveCreeps(assignedRoomName, enums.BUILDER);
        const smallBuildersCount = util.filter(activeBuilders, o => measurePotency(o) < maxPotency).length;
        if (maxPotency >= ideals.builderPotency || smallBuildersCount > 0) {
            potency = Math.min(maxPotency, ideals.builderPotency);
        }
    }
    return generateBodyInternal(potency, spawnRoom, d, isRemote);
}

function generateBodyInternal(desiredPotency: number, spawnRoom: Room, d: BodyDefinition, isRemote: boolean): BodyResult {

    const maxPotency = getMaxPotency(d, spawnRoom, isRemote);
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
    while (moveParts > 0) {
        body = body.concat([MOVE]);
        moveParts--;
    }
    while (rangedAttackParts > 0) {
        body = body.concat([RANGED_ATTACK]);
        rangedAttackParts--;
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

function getMaxPotency(d: BodyDefinition, spawnRoom: Room, isRemote: boolean) {
    const unitCost = getUnitCostFromDefinition(d);
    // round unit cost up to the nearest 100, to adjust for the rounding that occurs for move and carry parts
    const adjustedUnitCost = Math.ceil(unitCost / 100) * 100;
    const canTransport = spawnRoom.storage && spawnRoom.find(FIND_MY_CREEPS, {
        filter: o => o.memory.role === enums.TRANSPORTER && o.memory.assignedRoomName === spawnRoom.name
    }).length > 0;
    const energyAvailable = canTransport ? spawnRoom.energyCapacityAvailable : spawnRoom.energyAvailable;
    return Math.floor(energyAvailable / adjustedUnitCost);
}

export function getCost(body: string[]) {
    return (util.countBodyParts(body, WORK) * 100)
        + (util.countBodyParts(body, CARRY) * 50)
        + (util.countBodyParts(body, MOVE) * 50)
        + (util.countBodyParts(body, CLAIM) * 600)
        + (util.countBodyParts(body, ATTACK) * 80)
        + (util.countBodyParts(body, RANGED_ATTACK) * 150)
        + (util.countBodyParts(body, TOUGH) * 10)
        + (util.countBodyParts(body, HEAL) * 250);
}

export function getSpawnTime(body: string[]): number {
    return body.length * 3;
}

export function getUnladenSpeedOnRoads(body: string[]): number {
    const moveParts = util.countBodyParts(body, MOVE);
    const carryParts = util.countBodyParts(body, CARRY);
    const heavyParts = body.length - moveParts - carryParts;
    return Math.min(1, 2 * moveParts / heavyParts);
}

export function getMoveSpeed(role: RoleConstant, subRole?: SubRoleConstant) {
    const bodyType = getBodyTypeFromRole(role, subRole);
    const d = getDefinition(bodyType);
    return Math.min(1, d.move / countFatigueGeneratingParts(d));
}

export function getUnitSpawnTime(role: RoleConstant, subRole?: SubRoleConstant) {
    const bodyType = getBodyTypeFromRole(role, subRole);
    return 3 * countParts(getDefinition(bodyType));
}

export function getUnitCost(role: RoleConstant, subRole?: SubRoleConstant) {
    const bodyType = getBodyTypeFromRole(role, subRole);
    return getUnitCostFromDefinition(getDefinition(bodyType));
}

export function measurePotency(creep: Creep) {
    const d = getDefinition(getBodyTypeFromRole(creep.memory.role, creep.memory.subRole));
    return util.count(creep.body, o => o.type === d.meter);
}

function countParts(d: BodyDefinition) {
    return countFatigueGeneratingParts(d) + d.move;
}

function countFatigueGeneratingParts(d: BodyDefinition) {
    return d.work + d.carry + d.attack + d.rangedAttack + d.tough + d.heal + d.claim;
}

function getMovePartsRequiredForSpeed(d: BodyDefinition, speed: number) {
    // a speed of 1 move per tick on plains (speed = 1) requires a number of move parts equal to the total of all other parts
    return countFatigueGeneratingParts(d) * speed;
}

function getUnitCostFromDefinition(d: BodyDefinition, isRemote?: boolean) {
    const move = isRemote && d.remoteMove ? d.remoteMove : d.move;
    return (100 * d.work) +
        (50 * d.carry) +
        (50 * move) +
        (80 * d.attack) +
        (150 * d.rangedAttack) +
        (10 * d.tough) +
        (250 * d.heal) +
        (600 * d.claim);
}

export function getPotency(roomName: string, role: RoleConstant, subRole?: SubRoleConstant, assignmentId?: string) {
    const activeCreeps = getActiveCreeps(roomName, role, subRole, assignmentId);
    const potencyFromLivingCreeps = util.sum(activeCreeps, measurePotency);
    const potencyFromSpawnQueue = getPotencyInQueue(roomName, role, subRole, assignmentId);
    return potencyFromLivingCreeps + potencyFromSpawnQueue;
}

export function getActiveCreeps(roomName: string, role: RoleConstant, subRole?: SubRoleConstant, assignmentId?: string): Creep[] {
    return _.filter(Game.creeps, (o: Creep) =>
        !o.memory.isElderly &&
        !o.memory.markedForRecycle &&
        o.memory.role === role &&
        o.memory.assignedRoomName === roomName &&
        (!subRole || o.memory.subRole === subRole) &&
        (!assignmentId || o.memory.assignmentId === assignmentId));
}

function getPotencyInQueue(roomName: string, role: RoleConstant, subRole?: SubRoleConstant, assignmentId?: string): number {
    const creeps = getCreepsInQueue(roomName, role, subRole, assignmentId);
    return util.sum(creeps, (o: SpawnQueueItem) => o.potency);
}

export function getCreepsInQueue(roomName: string, role: RoleConstant, subRole?: SubRoleConstant, assignmentId?: string) {
    var result: SpawnQueueItem[] = [];
    for (let i in Game.spawns) {
        const spawn = Game.spawns[i];
        const queue = util.getSpawnMemory(spawn).queue || [];
        const filtered = util.filter(queue, (o: SpawnQueueItem) =>
            o.role === role &&
            o.assignedRoomName === roomName &&
            (!subRole || o.subRole === subRole) &&
            (!assignmentId || o.assignmentId === assignmentId));
        result = result.concat(filtered);
    }
    return result;
}