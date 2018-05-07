"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const map = require("./map");
const util = require("./util");
const rooms = require("./rooms");
const cache = require("./cache");
const spawnSiege = require("./manager.spawn.siege");
const sourceManager = require("./manager.sources");
var harvesterMovePartsPerWorkPart = 0.33;
var harvesterExtraCarryPartsPerWorkPart = 0.1;
var transporterMovePartsPerCarryPart = 0.5;
var builderCarryPartsPerWorkPart = 0.75;
var builderMovePartsPerWorkPart = 0.5;
var hubFlag;
function run() {
    const controlDirectives = _.filter(rooms.getControlDirectives(), (o) => o.doClaim || o.doReserve);
    const username = _.find(Game.structures).owner.username;
    // TODO cache this
    var allSpawns = [];
    for (let i in controlDirectives) {
        const d = controlDirectives[i];
        const room = Game.rooms[d.roomName];
        const spawnsInRoom = room ? room.find(FIND_MY_SPAWNS) : [];
        for (let j in spawnsInRoom) {
            const spawn = spawnsInRoom[j];
            allSpawns.push(getSpawnInfo(spawn, d.doClaim));
        }
    }
    for (let i in controlDirectives) {
        const d = controlDirectives[i];
        runRoomSpawn(d.roomName, d.doClaim);
    }
    if (Memory['siegeMode']) {
        spawnSiege.run();
    }
    function getSpawnInfo(spawn, doClaim) {
        const maxEnergyAvailable = spawn.room.energyCapacityAvailable;
        return {
            id: spawn.id,
            maxEnergyAvailable: maxEnergyAvailable,
            maxHarvesterWorkParts: Math.floor((maxEnergyAvailable - 50) / (100 + (50 * harvesterMovePartsPerWorkPart) + (50 * harvesterExtraCarryPartsPerWorkPart))) - (doClaim ? 0 : 1),
            maxTransporterCarryParts: Math.floor(maxEnergyAvailable / (50 + (50 * transporterMovePartsPerCarryPart))),
            maxBuilderWorkParts: Math.floor(maxEnergyAvailable / (100 + (50 * builderCarryPartsPerWorkPart) + (50 * builderMovePartsPerWorkPart))) - (doClaim ? 0 : 1)
        };
    }
    function runRoomSpawn(roomName, doClaim) {
        var room = Game.rooms[roomName];
        var roomMemory = Memory.rooms[roomName] || {};
        hubFlag = util.findHubFlag(room);
        var spawnMapInfos = map.findNearbySpawns(roomName);
        // TODO be smarter about choosing spawns
        // for now, just use the nearest spawns. later we will want to be able to take creeps from more
        // distant rooms for situations like defense.
        var lowestDistance = _.min(spawnMapInfos, o => o.distance).distance;
        spawnMapInfos = _.filter(spawnMapInfos, o => o.distance === lowestDistance);
        var spawns = [];
        spawnMapInfos.forEach(o => {
            const spawn = _.filter(allSpawns, (p) => p.id === o.id)[0];
            spawn.distance = o.distance;
            spawns.push(spawn);
        });
        spawns = _.sortBy(spawns, (o) => o.distance / o.maxEnergyAvailable);
        if (!areSpawnsUsable())
            return;
        if (!spawns.some(o => o.distance === 0)) {
            // there are no spawns in this room. if we want to set up a colony in this room, we'll need colonists.
            if (doClaim) {
                runColonistSpawn();
                return;
            }
            else {
                // we only want to reserve the room, not claim it.
                // we don't return here, so the rest of runRoomSpawn will execute as normal.
                const spawnInfo = spawns[0];
                spawnClaimers(spawnInfo);
                // do return if we don't have eyes in the room. the claimer will give us eyes.
                if (!room)
                    return;
            }
        }
        function areSpawnsUsable() {
            return spawns.length && spawns.some(o => {
                const spawn = Game.getObjectById(o.id);
                return !spawn.spawning && spawn.room.energyAvailable >= 200;
            });
        }
        var wartime = util.isWartime(room);
        // if not in wartime, and we haven't received an explicit order, only run the spawn script every X ticks to save CPU
        if (!wartime && !roomMemory.doRefreshSpawn && Game.time % 12 !== 0)
            return;
        roomMemory.doRefreshSpawn = false;
        Memory.rooms[roomName] = roomMemory;
        var activeSources = room.find(FIND_SOURCES, {
            filter: o => _.filter(o.pos.findInRange(FIND_STRUCTURES, 2), p => p.structureType === STRUCTURE_CONTAINER || p.structureType === STRUCTURE_LINK).length
        });
        var activeMinerals = room.find(FIND_MINERALS, {
            filter: o => o.mineralAmount > 0
                && _.filter(o.pos.findInRange(FIND_STRUCTURES, 2), p => p.structureType === STRUCTURE_CONTAINER).length
                && _.filter(o.pos.lookFor(LOOK_STRUCTURES), p => p.structureType === STRUCTURE_EXTRACTOR).length
        });
        var towers = room.find(FIND_MY_STRUCTURES, { filter: o => o.structureType === STRUCTURE_TOWER });
        var links = room.find(FIND_MY_STRUCTURES, { filter: o => o.structureType === STRUCTURE_LINK });
        var extractors = room.find(FIND_MY_STRUCTURES, { filter: o => o.structureType === STRUCTURE_EXTRACTOR });
        var nonRoadConstructionSites = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: o => o.structureType !== STRUCTURE_ROAD });
        var containers = room.find(FIND_STRUCTURES, { filter: o => o.structureType === STRUCTURE_CONTAINER });
        var storageUnits = room.find(FIND_MY_STRUCTURES, { filter: o => o.structureType === STRUCTURE_STORAGE });
        const totalTransportDistanceForSources = _.sum(activeSources.map(o => sourceManager.getSourceMetrics(o).transportDistance || 10));
        var idealHarvesterWorkPartsPerSource = 7;
        var idealHarvesterWorkPartsPerMineral = 18;
        var idealTotalTransporterCarryParts = Math.max(0, Math.ceil(Math.pow(totalTransportDistanceForSources, .7) * 1.9) - 4)
            + Math.ceil(room.energyCapacityAvailable / 1000);
        // HACK because this room has a lot of remote mining operations and has to spawn a lot
        if (roomName === 'E44N32') {
            idealTotalTransporterCarryParts += 6;
        }
        if (totalTransportDistanceForSources > 0 && idealTotalTransporterCarryParts <= 0) {
            idealTotalTransporterCarryParts = 2;
        }
        var idealTotalUpgraderWorkParts = Math.max(3, Math.ceil(3.5 * activeSources.length));
        var idealTotalWallBuilderWorkParts = Math.max(2, Math.ceil(3.5 * activeSources.length));
        if (doClaim) {
            idealTotalTransporterCarryParts += 6;
            if (wartime) {
                idealTotalTransporterCarryParts += 6;
            }
            if (!towers.length) {
                idealTotalTransporterCarryParts -= 2;
                idealTotalUpgraderWorkParts += 2;
                idealTotalWallBuilderWorkParts += 2;
            }
            if (!extractors.length) {
                idealTotalTransporterCarryParts += 1;
                idealTotalUpgraderWorkParts += 2;
            }
            if (links.length < 3) {
                idealTotalTransporterCarryParts += 3;
            }
            if (!containers.length) {
                idealTotalUpgraderWorkParts -= 5;
                idealTotalWallBuilderWorkParts -= 5;
            }
            if (!storageUnits.length) {
                idealTotalUpgraderWorkParts += 2;
                idealTotalWallBuilderWorkParts += 2;
                idealTotalTransporterCarryParts -= 3;
            }
            if (storageUnits.length && hubFlag) {
                idealTotalTransporterCarryParts -= 4;
            }
            if (nonRoadConstructionSites.length) {
                idealTotalUpgraderWorkParts += 1;
                idealTotalWallBuilderWorkParts += 1;
            }
            if (!containers.length && !storageUnits.length) {
                idealTotalTransporterCarryParts = 0;
            }
            if (_.sortBy(spawns, o => -o.maxEnergyAvailable)[0].maxEnergyAvailable < 550) {
                idealTotalUpgraderWorkParts = Math.floor(idealTotalUpgraderWorkParts * 3 / 4);
                idealTotalWallBuilderWorkParts = 0;
            }
        }
        else {
            idealTotalUpgraderWorkParts += idealTotalWallBuilderWorkParts;
            idealTotalWallBuilderWorkParts = 0;
        }
        if (room && room.storage) {
            var consumptionMode = roomMemory.consumptionMode;
            if (!consumptionMode && _.sum(room.storage.store) > 950000) {
                consumptionMode = true;
            }
            else if (consumptionMode && _.sum(room.storage.store) < 900000) {
                consumptionMode = false;
            }
            if (consumptionMode) {
                idealTotalTransporterCarryParts += 7;
                idealTotalUpgraderWorkParts += 20;
            }
            roomMemory.consumptionMode = consumptionMode;
            Memory.rooms[roomName] = roomMemory;
        }
        if (!doClaim && room && !room.find(FIND_MY_CONSTRUCTION_SITES).length) {
            idealTotalUpgraderWorkParts = Math.ceil(room.find(FIND_STRUCTURES).length / 12);
            idealTotalWallBuilderWorkParts = 0;
        }
        if (wartime) {
            spawnForWartime();
        }
        else {
            spawnForPeacetime();
        }
        function spawnForWartime() {
            // keep it simple for now -- just iterate through all the available spawns until we get one
            // that can be used
            for (let i = 0; i < spawns.length; i++) {
                if (doClaim) {
                    if (spawnTransporters(spawns[i]))
                        return;
                    const attackPower = _.sum(getCreeps(roomName, 'meleeMercenary'), (o) => o.getActiveBodyparts(ATTACK) * 1.5);
                    const rangedAttackPower = _.sum(getCreeps(roomName, 'rangedMercenary'), (o) => o.getActiveBodyparts(RANGED_ATTACK));
                    if (attackPower < rangedAttackPower) {
                        if (spawnMeleeMercenary(spawns[i]))
                            return;
                    }
                    if (spawnRangedMercenary(spawns[i]))
                        return;
                }
                else {
                    var ravagers = getCreeps(roomName, 'ravager');
                    if (!ravagers.length) {
                        var result = spawnRavager(spawns[i]);
                        if (result) {
                            Game.notify('Spawning a ravager in room ' + roomName);
                        }
                    }
                }
            }
        }
        function spawnForPeacetime() {
            var spawnsToUse = spawns;
            if (!doClaim) {
                // HACK hard code which spawn to use until we can get intelligence
                spawnsToUse = _.filter(allSpawns, (o) => o.id === Game.spawns['Spawn2'].id);
                // just use the one spawn which is closest by path to one of the sources in this room
                // TODO this won't work because findPathTo doesn't look across rooms
                //var source = room.find<Source>(FIND_SOURCES)[0];
                //if (source) {
                //    spawnsToUse = _.sortBy(spawnsToUse, (o: SpawnInfo) => {
                //        var s = Game.getObjectById<Spawn>(o.id);
                //        return s.pos.findPathTo(source).length;
                //    });
                //    spawnsToUse = [spawnsToUse[0]];
                //}
            }
            // keep it simple for now -- just iterate through all the available spawns until
            // we get one that can be used
            for (let i = 0; i < spawnsToUse.length; i++) {
                if (spawnBuilders(spawnsToUse[i], 'wallBuilder', idealTotalWallBuilderWorkParts))
                    return;
                if (spawnBuilders(spawnsToUse[i], 'upgrader', idealTotalUpgraderWorkParts))
                    return;
                if (spawnHarvesters(spawnsToUse[i]))
                    return;
                if (spawnTransporters(spawnsToUse[i]))
                    return;
            }
            if (doClaim) {
                // spawn a hub
                if (hubFlag && storageUnits.length) {
                    const spawns = hubFlag.pos.findInRange(FIND_MY_SPAWNS, 1);
                    for (let i in spawns) {
                        if (spawnHub(spawns[i], hubFlag))
                            return;
                    }
                }
            }
        }
        function spawnHarvesters(spawnInfo) {
            var harvesters = getCreeps(roomName, 'harvester');
            // sort sources so that we prioritize the source nearest to the spawn
            var spawnsInRoom = room.find(FIND_MY_SPAWNS);
            if (spawnsInRoom.length) {
                activeSources = _.sortBy(activeSources, o => o.pos.findPathTo(spawnsInRoom[0].pos).length);
            }
            for (let i = 0; i < activeSources.length; i++) {
                if (spawnHarvestersForAssignment(activeSources[i], idealHarvesterWorkPartsPerSource))
                    return true;
            }
            for (let i = 0; i < activeMinerals.length; i++) {
                if (spawnHarvestersForAssignment(activeMinerals[i], idealHarvesterWorkPartsPerMineral))
                    return true;
            }
            return false;
            function spawnHarvestersForAssignment(assignment, idealWorkParts) {
                var assignedHarvesters = _.filter(harvesters, o => o.memory.assignmentId === assignment.id);
                var workParts = _.sum(assignedHarvesters, (o) => o.getActiveBodyparts(WORK));
                var workPartsNeeded = idealWorkParts - workParts;
                if (workPartsNeeded > 0) {
                    if (spawnHarvester(assignedHarvesters, assignment, workPartsNeeded, idealWorkParts))
                        return true;
                }
                else if (assignedHarvesters.length && workPartsNeeded < 0) {
                    assignedHarvesters[0].memory.markedForRecycle = true;
                }
                return false;
            }
            function spawnHarvester(assignedHarvesters, assignment, workParts, idealTotalWorkParts) {
                const maxHarvesterWorkParts = spawnInfo.maxHarvesterWorkParts;
                workParts = Math.min(workParts || 1, maxHarvesterWorkParts);
                if (workParts < maxHarvesterWorkParts) {
                    // there's no reason for us to ever have more than one harvester that is smaller than the maximum size.
                    // if there are two that are smaller than the maximum size, we can always replace them with a bigger one
                    // and an even smaller one, with the hope that the smaller one would be zero and would reduce the total
                    // number of harvesters we're supporting. fewer harvesters means less traffic and less CPU.
                    // if the max harvester size is greater than or equal to the ideal total size, we can get by with just
                    // one harvester (which is ideal);
                    var smallHarvestersCount = _.filter(assignedHarvesters, (o) => o.getActiveBodyparts(WORK) < maxHarvesterWorkParts).length;
                    if (maxHarvesterWorkParts >= idealTotalWorkParts || smallHarvestersCount > 0) {
                        workParts = Math.min(maxHarvesterWorkParts, idealTotalWorkParts);
                    }
                }
                var moveParts = Math.max(1, Math.floor(workParts * harvesterMovePartsPerWorkPart));
                var spawn = Game.getObjectById(spawnInfo.id);
                if (spawn.room.name !== roomName) {
                    moveParts++;
                    if (workParts > 3)
                        moveParts++;
                }
                var body = [CARRY];
                if (workParts >= 10) {
                    body = body.concat([CARRY]);
                }
                for (let i = 0; i < workParts; i++) {
                    body = body.concat([WORK]);
                }
                for (let i = 0; i < moveParts; i++) {
                    body = body.concat([MOVE]);
                }
                return spawnCreep(spawnInfo.id, 'harvester', body, assignment);
            }
        }
        function spawnTransporters(spawnInfo) {
            let idealCarryParts = idealTotalTransporterCarryParts;
            if (!doClaim) {
                for (let i = 0; i < activeSources.length; i++) {
                    const source = activeSources[i];
                    const key = 'b8847292-ebbb-4430-929a-efe6c7a84d32.' + source.id + '.' + spawnInfo.id;
                    idealCarryParts += cache.get(key, 117, () => {
                        const exitDirection = source.room.findExitTo(Game.getObjectById(spawnInfo.id).room);
                        const exit = source.pos.findClosestByRange(exitDirection);
                        if (!exit)
                            return 0;
                        const distance = source.pos.findPathTo(exit).length;
                        return 2 + Math.floor(distance / 3);
                    });
                }
            }
            var transporters = getCreeps(roomName, 'transporter');
            var totalCarryParts = _.sum(transporters, (o) => o.getActiveBodyparts(CARRY));
            var carryPartsNeeded = idealCarryParts - totalCarryParts;
            if (carryPartsNeeded > 0) {
                if (spawnTransporter(carryPartsNeeded))
                    return true;
            }
            else if (transporters.length && carryPartsNeeded < 0) {
                transporters[0].memory.markedForRecycle = true;
            }
            return false;
            function spawnTransporter(carryParts) {
                const maxTransporterCarryParts = Math.min(doClaim ? 5 : 24, spawnInfo.maxTransporterCarryParts);
                carryParts = Math.min(carryParts || 1, maxTransporterCarryParts);
                if (carryParts < maxTransporterCarryParts) {
                    var smallTransportersCount = _.filter(transporters, (o) => o.getActiveBodyparts(CARRY) < maxTransporterCarryParts).length;
                    if (maxTransporterCarryParts >= idealCarryParts || smallTransportersCount > 0) {
                        carryParts = Math.min(maxTransporterCarryParts, idealCarryParts);
                    }
                }
                var moveParts = Math.max(1, Math.floor(carryParts * transporterMovePartsPerCarryPart));
                var body = [];
                for (let i = 0; i < carryParts; i++) {
                    body = body.concat([CARRY]);
                }
                for (let i = 0; i < moveParts; i++) {
                    body = body.concat([MOVE]);
                }
                return spawnCreep(spawnInfo.id, 'transporter', body);
            }
        }
        function spawnBuilders(spawnInfo, subRole, idealTotalWorkParts) {
            var builders = getCreeps(roomName, 'builder', subRole);
            var totalWorkParts = _.sum(builders, (o) => o.getActiveBodyparts(WORK));
            var workPartsNeeded = idealTotalWorkParts - totalWorkParts;
            if (workPartsNeeded > 0) {
                for (let i in builders) {
                    if (builders[i].memory.markedForRecycle) {
                        builders[i].memory.markedForRecycle = false;
                        util.setMoveTarget(builders[i], null);
                    }
                }
                if (spawnBuilder(workPartsNeeded))
                    return true;
            }
            else if (builders.length && workPartsNeeded < 0 && builders[0].memory.subRole !== 'colonist') {
                builders[0].memory.markedForRecycle = true;
            }
            return false;
            function spawnBuilder(workParts) {
                var maxBuilderWorkParts = Math.min(7, spawnInfo.maxBuilderWorkParts);
                if (!getCreeps(roomName, 'builder').length) {
                    // do recovery mode
                    maxBuilderWorkParts = 1;
                }
                workParts = Math.min(workParts || 1, maxBuilderWorkParts);
                if (workParts < maxBuilderWorkParts) {
                    var smallBuildersCount = _.filter(builders, (o) => o.getActiveBodyparts(WORK) < maxBuilderWorkParts).length;
                    if (maxBuilderWorkParts >= idealTotalWorkParts || smallBuildersCount > 0) {
                        workParts = Math.min(maxBuilderWorkParts, idealTotalWorkParts);
                    }
                }
                var carryParts = Math.max(1, Math.floor(workParts * builderCarryPartsPerWorkPart));
                var moveParts = Math.max(1, Math.floor(workParts * builderMovePartsPerWorkPart));
                var spawn = Game.getObjectById(spawnInfo.id);
                if (spawn.room.name !== roomName) {
                    moveParts++;
                    if (workParts > 3)
                        moveParts++;
                }
                var body = [];
                for (let i = 0; i < workParts; i++) {
                    body = body.concat([WORK]);
                }
                for (let i = 0; i < carryParts; i++) {
                    body = body.concat([CARRY]);
                }
                for (let i = 0; i < moveParts; i++) {
                    body = body.concat([MOVE]);
                }
                return spawnCreep(spawnInfo.id, 'builder', body, null, subRole);
            }
        }
        function spawnHub(spawn, hubFlag) {
            if (getCreeps(roomName, 'hub').length)
                return;
            const carryParts = Math.floor(.65 * Math.sqrt(spawn.room.energyCapacityAvailable / 50));
            var body = [];
            for (let i = 0; i < carryParts; i++) {
                body = body.concat([CARRY]);
            }
            const directions = [spawn.pos.getDirectionTo(hubFlag)];
            return spawnCreep(spawn.id, 'hub', body, undefined, undefined, directions);
        }
        function spawnMeleeMercenary(spawnInfo) {
            const role = 'meleeMercenary';
            const body = [
                TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
                ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
            ];
            return spawnCreep(spawnInfo.id, role, body);
        }
        function spawnRangedMercenary(spawnInfo) {
            const role = 'rangedMercenary';
            const body = [
                TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
            ];
            return spawnCreep(spawnInfo.id, role, body);
        }
        function spawnRavager(spawnInfo) {
            const role = 'ravager';
            const body = [
                TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
                RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE, MOVE, MOVE, MOVE
            ];
            return spawnCreep(spawnInfo.id, role, body);
        }
        function spawnCreep(spawnId, role, body, assignment, subRole, directions) {
            const name = role + Game.time;
            const spawn = Game.getObjectById(spawnId);
            var homeRoomName = spawn.room.name;
            // don't spawn a creep into a hub flag
            if (!directions && hubFlag && hubFlag.pos.inRangeTo(spawn, 1)) {
                directions = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];
                const removeIndex = directions.indexOf(spawn.pos.getDirectionTo(hubFlag));
                if (removeIndex > -1) {
                    directions.splice(removeIndex, 1);
                }
            }
            const options = {
                directions: directions,
                memory: {
                    role: role,
                    assignmentId: assignment ? assignment.id : null,
                    subRole: subRole,
                    homeRoomName: homeRoomName,
                    assignedRoomName: roomName,
                    doClaim: doClaim
                }
            };
            if (roomName !== homeRoomName && role === 'transporter' || role === 'builder' || role === 'harvester') {
                const remoteMiningMetrics = Memory.remoteMiningMetrics || {};
                const roomMetrics = remoteMiningMetrics[roomName] || { cost: 0, income: 0 };
                const cost = (countBodyParts(body, 'WORK') * 100)
                    + (countBodyParts(body, 'MOVE') * 50)
                    + (countBodyParts(body, 'CARRY') * 50)
                    + (countBodyParts(body, 'CLAIM') * 600);
                roomMetrics.cost += cost;
                remoteMiningMetrics[roomName] = roomMetrics;
                Memory.remoteMiningMetrics = remoteMiningMetrics;
            }
            const result = spawn.spawnCreep(body, name, options);
            return result === OK;
        }
        function runColonistSpawn() {
            // TODO be smarter about choosing a spawn
            const spawnInfo = spawns[0];
            if (!room) {
                // we have no visibility in this room. assume it's free to claim and spawn a colonist with a claim part
                spawnColonists(spawnInfo, 1, 1);
            }
            else if (!room.controller) {
                console.log('room ' + roomName + ' cannot be colonized because it does not have a controller');
            }
            else if (room.controller.my) {
                // controller is mine. spawn colonists without claim parts
                spawnColonists(spawnInfo, 2, 0);
            }
            else if (!room.controller.owner && !room.controller.reservation) {
                // controller is not mine but free to claim. spawn colonists with claim parts
                spawnColonists(spawnInfo, 2, 1);
            }
            else {
                // controller is owned or reserved by another player. spawn a claimer
                spawnClaimers(spawnInfo);
            }
        }
        function spawnColonists(spawnInfo, count, claimParts) {
            if (getCreeps(roomName, 'builder').length >= count) {
                return false;
            }
            var role = 'builder';
            var subRole = 'colonist';
            var body = [
                WORK, WORK, WORK,
                CARRY, CARRY, CARRY, CARRY,
                MOVE, MOVE, MOVE, MOVE
            ];
            if (spawnInfo.maxEnergyAvailable >= 1200 + (600 * claimParts)) {
                body = body.concat([WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE]);
            }
            for (let i = 0; i < claimParts; i++) {
                body = body.concat([CLAIM]);
            }
            return spawnCreep(spawnInfo.id, role, body, null, subRole);
        }
        function spawnClaimers(spawnInfo) {
            const currentClaimerParts = _.sum(getCreeps(roomName, 'claimer').map(o => o.getActiveBodyparts(CLAIM)));
            const desiredClaimerParts = 3;
            const claimerPartsNeeded = desiredClaimerParts - currentClaimerParts;
            if (claimerPartsNeeded <= 0) {
                return false;
            }
            if (!doClaim && room && room.controller && room.controller.reservation
                && room.controller.reservation.username === username && room.controller.reservation.ticksToEnd > 3500) {
                // the controller has been reserved for nearly the maximum amount of time. it's pointless to spawn a claimer right now.
                return false;
            }
            var body = [];
            var energyCost = 0;
            for (let i = 0; i < claimerPartsNeeded; i++) {
                energyCost += 650;
                if (spawnInfo.maxEnergyAvailable >= energyCost) {
                    body = body.concat([CLAIM, MOVE]);
                }
            }
            if (body.length) {
                return spawnCreep(spawnInfo.id, 'claimer', body);
            }
            return false;
        }
    }
    function getCreeps(roomName, role, subRole) {
        var creeps = [];
        for (let i in Game.creeps) {
            var creep = Game.creeps[i];
            if (creep.memory.role === role && creep.memory.assignedRoomName === roomName && (!subRole || creep.memory.subRole === subRole)) {
                creeps.push(creep);
            }
        }
        return creeps;
    }
    function sortCreeps(creeps) {
        return _.sortByAll(creeps, [o => o.body.length, o => o.ticksToLive]);
    }
    function countBodyParts(bodyParts, type) {
        return _.filter(bodyParts, (o) => o.toLowerCase() === type.toLowerCase()).length;
    }
}
exports.run = run;
//# sourceMappingURL=manager.spawn.js.map