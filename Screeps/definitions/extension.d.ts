
interface RepositoryInfo {
    repository: Structure;
    distance: number;
}

interface SourceMetrics {
    timestamp: number;
    transportDistance: number;
    repositoryId: string;
}

interface RaidWave {
    id: number;
    targetRoomName: string;
    deadline: number;
    ready?: boolean;
    creeps: Array<Id<Creep>>;
    targetStructureId?: Id<Structure>;
}

interface Memory {
    sourceMetrics: Array<SourceMetrics>;
    remoteMiningMetrics: any;
    raidWaves: Array<RaidWave>;
}

interface CreepMemory {
    role: string;
    subRole: string;
    assignedRoomName: string;
    isCollecting: boolean;
    assignments: Array<TransporterAssignment>;
    preferredWallId: Id<StructureWall | StructureRampart>;
    assignmentId: Id<any>;
    moveTargetId: Id<any>;
    moveTargetFlagId: Id<Flag>;
    moveTargetFlagName: string;
    moveTargetDesiredDistance: number;
    leaderTargetId: Id<any>;
    leaderTargetTime: number;
    isLeader: boolean;
    isElderly: boolean;
    markedForRecycle: boolean;
    homeRoomName: string;
    doClaim: boolean;
    charge: boolean;
    wait: boolean;
    raidWaveId: number;
}

interface TransporterAssignment {
    id: Id<Structure>;
    amount: number;
    priority: number;
}

interface SpawnMapInfo {
    id: string;
    distance: number;
}

interface SourceOrder {
    roomName: string;
    sourceOrMineralId: string;
    harvesterPotency: number;
}

interface RoomOrder {
    roomName: string;
    wallBuilderPotency: number;
    upgraderPotency: number;
    transporterPotency: number;
    hubPotency: number;
    claimerPotency: number;
    scoutPotency: number;
    defenderPotency: number;
    raidWaveSize: number;
}

interface RoomMemory {
    order: RoomOrder;
    sourceOrders: { [id: string]: SourceOrder };
    consumptionMode: boolean;
    isConquered: boolean;
}

interface SpawnDistance {
    timestamp: number;
    distance: number;
}

interface SpawnQueueItem {
    spawnId: string;
    role: string;
    subRole: string;
    assignmentId: string;
    assignedRoomName: string;
    homeRoomName: string;
    doClaim: boolean;
    potency: number;
    energyCost: number;
    timeCost: number;
    raidWaveId: number
}

interface SpawnMemory {
    queue: SpawnQueueItem[];
    distances: { [roomName: string]: SpawnDistance };
}