import * as util from './util';
import * as enums from './enums';
import * as rooms from './rooms';

export interface BodyResult {
    body: BodyPartConstant[];
    potency: number;
}

export interface BodyDefinition {
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

export function getDefinition(bodyType: BodyTypeConstant): BodyDefinition {
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

export function getBodyTypeFromRole(role: RoleConstant, subRole?: SubRoleConstant): BodyTypeConstant {
    if (role === enums.COMBATANT) {
        return subRole;
    }
    return role;
}

export function getMaxPotency(d: BodyDefinition, spawnRoom: Room, isRemote: boolean) {
    const unitCost = getUnitCostFromDefinition(d);
    // round unit cost up to the nearest 100, to adjust for the rounding that occurs for move and carry parts
    const adjustedUnitCost = Math.ceil(unitCost / 100) * 100;
    const canTransport = spawnRoom.storage && spawnRoom.find(FIND_MY_CREEPS, {
        filter: o => o.memory.role === enums.TRANSPORTER && o.memory.assignedRoomName === spawnRoom.name
    }).length > 0;
    const canBuild = spawnRoom.find(FIND_MY_CREEPS, {
        filter: o => o.memory.role === enums.BUILDER && o.memory.assignedRoomName === spawnRoom.name
    }).length > 0;
    const energyAvailable = canTransport || canBuild ? spawnRoom.energyCapacityAvailable : spawnRoom.energyAvailable;
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