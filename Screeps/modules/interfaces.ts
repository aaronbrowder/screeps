export interface RoomMemory {
    order: RoomOrder;
    sourceOrders: { [id: string]: SourceOrder };
    consumptionMode: boolean;
    // LEGACY -  all below
    doRefreshSpawn: boolean;
    lastFoundNearbySpawns: number;
    nearbySpawns: SpawnMapInfo[];
}

export interface SpawnMemory {
    queue: SpawnQueueItem[];
    distances: { [roomName: string]: SpawnDistance };
}

export interface SpawnDistance {
    timestamp: number;
    distance: number;
}

export interface SpawnMapInfo {
    id: string;
    distance: number;
}

export interface RoomOrder {
    roomName: string;
    wallBuilderPotency: number;
    upgraderPotency: number;
    transporterPotency: number;
    hubPotency: number;
}

export interface SourceOrder {
    sourceOrMineralId: string;
    harvesterPotency: number;
}

export interface SpawnQueueItem {
    role: string;
    subRole: string;
    assignmentId: string;
    assignedRoomName: string;
    homeRoomName: string;
    doClaim: boolean;
    potency: number;
    energyCost: number;
    timeCost: number;
}