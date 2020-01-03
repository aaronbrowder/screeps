
type HARVESTER = 'harvester';
type TRANSPORTER = 'transporter';
type BUILDER = 'builder';
type CLAIMER = 'claimer';
type SCOUT = 'scout';
type HUB = 'hub';
type RAVAGER = 'ravager';
type SLAYER = 'slayer';
type DEFENDER = 'defender';
type COMBATANT = 'combatant';

type BodyTypeConstant =
    HARVESTER |
    TRANSPORTER |
    BUILDER |
    CLAIMER |
    SCOUT |
    HUB |
    RAVAGER |
    SLAYER |
    DEFENDER;

type RoleConstant =
    HARVESTER |
    TRANSPORTER |
    BUILDER |
    CLAIMER |
    SCOUT |
    HUB |
    COMBATANT;

type SubRoleConstant =
    RAVAGER |
    SLAYER |
    DEFENDER;

type DIRECTIVE_NONE = 0;
type DIRECTIVE_CLAIM = 1;
type DIRECTIVE_RESERVE = 2;
type DIRECTIVE_HARVEST = 3;
type DIRECTIVE_RAID = 4;
type DIRECTIVE_RESERVE_AND_HARVEST = 5;

type DirectiveConstant =
    DIRECTIVE_NONE |
    DIRECTIVE_CLAIM |
    DIRECTIVE_RESERVE |
    DIRECTIVE_HARVEST |
    DIRECTIVE_RAID |
    DIRECTIVE_RESERVE_AND_HARVEST;

type LINK_SOURCE = 1;
type LINK_DESTINATION = 2;
type LINK_HUB = 3;

type LinkType = LINK_SOURCE | LINK_DESTINATION | LINK_HUB;

interface ControlDirective {
    roomName: string;
    flagName: string;
    directive: DirectiveConstant;
    raidDirective?: RaidDirective;
    raidWaveMeetupFlagName?: string;
}

interface RaidDirective {
    targetStructureIds: Array<Id<Structure>>;
    automateTargets: boolean;
    autoDeclareVictory: boolean;
    raiderRole: SubRoleConstant;
    // If maxPotency is set, we will only spawn a limited number of creeps. The creeps
    // will be respawned when they die or are about to die of age.
    // If maxPotency is not set, as many creeps as possible will be spawned until the
    // directive is turned off or until victory is declared.
    maxPotency?: number;
}

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
    leaderId?: Id<Creep>;
    creeps: Array<Id<Creep>>;
    targetStructureId?: Id<Structure>;
}

interface Memory {
    sourceMetrics: Array<SourceMetrics>;
    remoteMiningMetrics: any;
    raidWaves: Array<RaidWave>;
    links: { [linkId: string]: LinkType };
}

interface CreepMemory {
    role: RoleConstant;
    subRole: SubRoleConstant;
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
    builderPotency: number;
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
    wallBuildMode: boolean;
    isConquered: boolean;
}

interface SpawnDistance {
    timestamp: number;
    distance: number;
}

interface SpawnQueueItem {
    spawnId: string;
    role: RoleConstant;
    subRole: SubRoleConstant;
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
    threatLevel: number;
}