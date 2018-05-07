var map = require('map');
var util = require('util');
var spawnSiege = require('manager.spawn.siege');

var harvesterMovePartsPerWorkPart = 0.33;
var harvesterExtraCarryPartsPerWorkPart = 0.1;
var transporterMovePartsPerCarryPart = 0.5;
var builderCarryPartsPerWorkPart = 0.75;
var builderMovePartsPerWorkPart = 0.5;

module.exports = {
    run: function() {
        
        var username = _.find(Game.structures).owner.username;
        
        var controlDirectives = [
            { roomName: 'E51S16', doClaim: true },
            { roomName: 'E52S15', doClaim: true },
            { roomName: 'E51S15' }
        ];
        
        // TODO cache this
        // var allSpawns = [];
        // for (let i in controlDirectives) {
        //     const d = controlDirectives[i];
        //     const room = Game.rooms[d.roomName];
        //     const spawnsInRoom = room ? room.find(FIND_MY_SPAWNS) : [];
        //     for (let j in spawnsInRoom) {
        //         const spawn = spawnsInRoom[j];
        //         allSpawns.push(getSpawnInfo(spawn));
        //     }
        // }
        
        for (let i in controlDirectives) {
            const d = controlDirectives[i];
            runRoomSpawn(d.roomName, d.doClaim);
        }
        
        if (Memory.siegeMode) {
            spawnSiege.run();
        }
        
        function getSpawnInfo(spawn) {
            const extensions = spawn.room.find(FIND_STRUCTURES, { filter: o => o.structureType == STRUCTURE_EXTENSION && o.isActive() });
            const maxEnergyAvailable = 300 + (50 * extensions.length);
            return {
                id: spawn.id,
                maxEnergyAvailable: maxEnergyAvailable,
                maxHarvesterWorkParts: Math.floor((maxEnergyAvailable - 50) / (100 + (50 * harvesterMovePartsPerWorkPart) + (50 * harvesterExtraCarryPartsPerWorkPart))),
                maxTransporterCarryParts: Math.floor(maxEnergyAvailable / (50 + (50 * transporterMovePartsPerCarryPart))),
                maxBuilderWorkParts: Math.floor(maxEnergyAvailable / (100 + (50 * builderCarryPartsPerWorkPart) + (50 * builderMovePartsPerWorkPart)))
            };
        }
        
        function runRoomSpawn(roomName, doClaim) {
            var room = Game.rooms[roomName];
            var spawns = room ? room.find(FIND_MY_SPAWNS) : [];
            
            var usingHelperSpawns = false;
            
            if (!spawns.length) {
                // TODO cache this
                spawns = map.findHelperSpawns(roomName);
                if (!areSpawnsUsable()) return;
                usingHelperSpawns = true;
                // there are no spawns in this room but we can use helper spawns in other rooms.
                // the question is whether we are trying to colonize this room or just harvest some of its resources
                // without claiming the room.
                if (doClaim) {
                    runColonistSpawn();
                    return;
                } else {
                    // we only want to reserve the room, not claim it. we can reserve the room by spawning a claimer
                    // with doClaim = false. we don't return here, so the rest of runRoomSpawn will execute as normal.
                    spawnClaimer(false);
                    // do return if we don't have eyes in the room. the claimer will give us eyes.
                    if (!room) return;
                }
            }
            
            if (!areSpawnsUsable()) return;
            
            function areSpawnsUsable() {
                return spawns.length && spawns.some(o => !o.spawning && o.energy >= 200);
            }
            
            var wartime = util.isWartime(room);
            
            // if not in wartime, and we haven't received an explicit order, only run the spawn script every X ticks to save CPU
            var roomMemory = Memory.rooms[roomName] || {};
            if (!wartime && !roomMemory.doRefreshSpawn && Game.time % 12 !== 0) return;
            roomMemory.doRefreshSpawn = false;
            Memory.rooms[roomName] = roomMemory;
            
            var maxEnergyAvailable = _.max(spawns.map(spawn => {
                var extensions = spawn.room.find(FIND_STRUCTURES, { filter: 
                    o => o.structureType == STRUCTURE_EXTENSION && o.isActive()
                });
                return 300 + (50 * extensions.length);
            }));
            
            var activeSources = room.find(FIND_SOURCES, { filter: o => 
                _.filter(o.pos.findInRange(FIND_STRUCTURES, 2), p => p.structureType == STRUCTURE_CONTAINER).length
            });
            var activeMinerals = room.find(FIND_MINERALS, { filter: o => 
                o.mineralAmount > 0
                && _.filter(o.pos.findInRange(FIND_STRUCTURES, 2), p => p.structureType == STRUCTURE_CONTAINER).length
                && _.filter(o.pos.lookFor(LOOK_STRUCTURES), p => p.structureType == STRUCTURE_EXTRACTOR).length
            });
            
            var towers = room.find(FIND_STRUCTURES, { filter: o => o.structureType == STRUCTURE_TOWER });
            var links = room.find(FIND_STRUCTURES, { filter: o => o.structureType == STRUCTURE_LINK });
            var extractors = room.find(FIND_STRUCTURES, { filter: o => o.structureType == STRUCTURE_EXTRACTOR });
            var nonRoadConstructionSites = room.find(FIND_CONSTRUCTION_SITES, { filter: o => o.structureType != STRUCTURE_ROAD });
            
            //var isInRecoveryMode = !usingHelperSpawns && getIsInRecoveryMode(room);
            
            var maxHarvesterWorkPartsBasedOnExtensions = Math.floor((maxEnergyAvailable - 50) / (100 + (50 * harvesterMovePartsPerWorkPart) + (50 * harvesterExtraCarryPartsPerWorkPart)));
            var maxTransporterCarryPartsBasedOnExtensions = Math.floor(maxEnergyAvailable / (50 + (50 * transporterMovePartsPerCarryPart)));
            var maxBuilderWorkPartsBasedOnExtensions = Math.floor(maxEnergyAvailable / (100 + (50 * builderCarryPartsPerWorkPart) + (50 * builderMovePartsPerWorkPart)));
            
            var maxHarvesterWorkParts = maxHarvesterWorkPartsBasedOnExtensions;
            var maxTransporterCarryParts = Math.min(5, maxTransporterCarryPartsBasedOnExtensions);
            var maxBuilderWorkParts = Math.min(7, maxBuilderWorkPartsBasedOnExtensions);
            
            var idealHarvesterWorkPartsPerSource = 7;
            var idealHarvesterWorkPartsPerMineral = 20;
            var idealTotalTransporterCarryParts = 7 * activeSources.length;
            var idealTotalUpgraderWorkParts = Math.max(3, Math.ceil(3.5 * activeSources.length));
            var idealTotalWallBuilderWorkParts = Math.max(2, Math.ceil(3.5 * activeSources.length));
            
            if (doClaim) {
                if (wartime) {
                    idealTotalTransporterCarryParts += 6;
                }
                if (!towers.length) {
                    maxTransporterCarryParts += 1;
                    idealTotalTransporterCarryParts -= 2;
                    idealTotalUpgraderWorkParts += 2;
                    idealTotalWallBuilderWorkParts += 2;
                }
                if (!extractors.length) {
                    idealTotalTransporterCarryParts -= 1;
                    idealTotalUpgraderWorkParts += 2;
                }
                if (!links.length) {
                    idealTotalTransporterCarryParts += 4;
                }
                if (nonRoadConstructionSites.length) {
                    idealTotalUpgraderWorkParts += 1;
                    idealTotalWallBuilderWorkParts += 1;
                }
            } else {
                maxTransporterCarryParts = 16;
                idealTotalTransporterCarryParts += (7 * activeSources.length);
            }
            
            if (room && room.storage) {
                var roomMemory = Memory.rooms[roomName] || {};
                var consumptionMode = roomMemory.consumptionMode;
                if (!consumptionMode && _.sum(room.storage.store) > 950000) {
                    consumptionMode = true;
                }
                else if (consumptionMode && _.sum(room.storage.store) < 900000) {
                    consumptionMode = false;
                }
                if (consumptionMode) {
                    idealTotalTransporterCarryParts += 5;
                    idealTotalUpgraderWorkParts += 14;
                }
                roomMemory.consumptionMode = consumptionMode;
                Memory.rooms[roomName] = roomMemory;
            }
            
            if (!doClaim && room && !room.find(FIND_CONSTRUCTION_SITES).length) {
                idealTotalUpgraderWorkParts = 1;
                idealTotalWallBuilderWorkParts = 0;
            }
            
            // if (isInRecoveryMode) {
            //     idealHarvesterWorkPartsPerSource = 1;
            //     idealHarvesterWorkPartsPerMineralPerDensity = 0;
            //     idealTotalTransporterCarryParts = 1;
            //     idealTotalUpgraderWorkParts = 1;
            //     idealTotalWallBuilderWorkParts = 0;
            // }

            if (wartime) {
                if (doClaim) {
                    if (spawnTransporters()) return;
                    const attackPower = _.sum(getCreeps(roomName, 'meleeMercenary'), o => countBodyParts(o, ATTACK) * 1.5);
                    const rangedAttackPower = _.sum(getCreeps(roomName, 'rangedMercenary'), o => countBodyParts(o, RANGED_ATTACK));
                    if (attackPower < rangedAttackPower) {
                        if (spawnMeleeMercenary() == OK) return;
                    }
                    if (spawnRangedMercenary() == OK) return;
                } else {
                    var ravagers = getCreeps(roomName, 'ravager');
                    if (!ravagers.length) {
                        spawnRavager();
                    }
                }
            } else {
                if (spawnBuilders('wallBuilder', idealTotalWallBuilderWorkParts)) return;
                if (spawnBuilders('upgrader', idealTotalUpgraderWorkParts)) return;
                if (spawnHarvesters()) return;
                if (spawnTransporters()) return;
            }
            
            function spawnHarvesters() {
                var harvesters = getCreeps(roomName, 'harvester');
                // sort sources so that we prioritize the source nearest to the spawn
                var sources = _.sortBy(activeSources, o => o.pos.findPathTo(spawns[0].pos).length);
                sources = sources.concat(activeMinerals);
                for (let i = 0; i < sources.length; i++) {
                    var source = sources[i];
                    var isMineral = !source.energyCapacity;
                    var assignedHarvesters = _.filter(harvesters, o => o.memory.assignmentId === sources[i].id);
                    var workParts = _.sum(assignedHarvesters, o => countBodyParts(o, WORK));
                    var idealWorkParts = isMineral ? idealHarvesterWorkPartsPerMineral : idealHarvesterWorkPartsPerSource;
                    var workPartsNeeded = idealWorkParts - workParts;
                    if (workPartsNeeded > 0) {
                        if (spawnHarvester(assignedHarvesters, source, workPartsNeeded, idealWorkParts)) return true;
                    }
                    else if (workPartsNeeded < 0) {
                        assignedHarvesters[0].memory.markedForRecycle = true;
                    }
                }
                return false;
                function spawnHarvester(assignedHarvesters, assignment, workParts, idealTotalWorkParts) {
                    workParts = Math.min(workParts || 1, maxHarvesterWorkParts);
                    if (workParts < maxHarvesterWorkParts) {
                        // there's no reason for us to ever have more than one harvester that is smaller than the maximum size.
                        // if there are two that are smaller than the maximum size, we can always replace them with a bigger one
                        // and an even smaller one, with the hope that the smaller one would be zero and would reduce the total
                        // number of harvesters we're supporting. fewer harvesters means less traffic and less CPU.
                        // if the max harvester size is greater than or equal to the ideal total size, we can get by with just
                        // one harvester (which is ideal);
                        var smallHarvestersCount = _.filter(assignedHarvesters, o => countBodyParts(o, WORK) < maxHarvesterWorkParts).length;
                        if (maxHarvesterWorkParts >= idealTotalWorkParts || smallHarvestersCount > 0) {
                            workParts = Math.min(maxHarvesterWorkParts, idealTotalWorkParts);
                        }
                    }
                    var moveParts = Math.max(1, Math.floor(workParts * harvesterMovePartsPerWorkPart));
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
                    return spawnCreep('harvester', body, assignment);   
                }
            }
            
            function spawnTransporters() {
                var transporters = getCreeps(roomName, 'transporter');
                var totalCarryParts = _.sum(transporters, o => countBodyParts(o, CARRY));
                var carryPartsNeeded = idealTotalTransporterCarryParts - totalCarryParts;
                if (carryPartsNeeded > 0) {
                    if (spawnTransporter(carryPartsNeeded)) return true;
                }
                else if (carryPartsNeeded < 0) {
                    transporters[0].memory.markedForRecycle = true;
                }
                return false;
                function spawnTransporter(carryParts) {
                    carryParts = Math.min(carryParts || 1, maxTransporterCarryParts);
                    if (carryParts < maxTransporterCarryParts) {
                        var smallTransportersCount = _.filter(transporters, o => countBodyParts(o, CARRY) < maxTransporterCarryParts).length;
                        if (maxTransporterCarryParts >= idealTotalTransporterCarryParts || smallTransportersCount > 0) {
                            carryParts = Math.min(maxTransporterCarryParts, idealTotalTransporterCarryParts);
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
                    return spawnCreep('transporter', body);   
                }
            }
            
            function spawnBuilders(subRole, idealTotalWorkParts) {
                var builders = getCreeps(roomName, 'builder', subRole);
                var totalWorkParts = _.sum(builders, o => countBodyParts(o, WORK));
                var workPartsNeeded = idealTotalWorkParts - totalWorkParts;
                if (workPartsNeeded > 0) {
                    for (let i in builders) {
                        if (builders[i].memory.markedForRecycle) {
                            builders[i].memory.markedForRecycle = false;
                            builders[i].memory.moveTargetId = null;
                        }
                    }
                    if (spawnBuilder(workPartsNeeded)) return true;
                }
                else if (workPartsNeeded < 0 && builders[0].memory.subRole !== 'colonist') {
                    builders[0].memory.markedForRecycle = true;
                }
                return false;
                function spawnBuilder(workParts) {
                    workParts = Math.min(workParts || 1, maxBuilderWorkParts);
                    if (workParts < maxBuilderWorkParts) {
                        var smallBuildersCount =  _.filter(builders, o => countBodyParts(o, WORK) < maxBuilderWorkParts).length;
                        if (maxBuilderWorkParts >= idealTotalWorkParts || smallBuildersCount > 0) {
                            workParts = Math.min(maxBuilderWorkParts, idealTotalWorkParts);
                        }
                    }
                    var carryParts = Math.max(1, Math.floor(workParts * builderCarryPartsPerWorkPart));
                    var moveParts = Math.max(1, Math.floor(workParts * builderMovePartsPerWorkPart));
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
                    return spawnCreep('builder', body, null, subRole);
                }
            }
            
            function spawnMeleeMercenary() {
                const role = 'meleeMercenary';
                const body = [
                    TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,
                    ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,
                    ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,
                    MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE
                    ];
                return spawnCreep(role, body);
            }
            
            function spawnRangedMercenary() {
                const role = 'rangedMercenary';
                const body = [
                    TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,
                    RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,
                    RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,
                    MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE
                    ];
                return spawnCreep(role, body);
            }
            
            function spawnRavager() {
                const role = 'ravager';
                const body = [
                    TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,
                    ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,
                    RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,
                    MOVE,MOVE,MOVE,MOVE,MOVE,
                    MOVE,MOVE,MOVE,MOVE,MOVE,
                    MOVE,MOVE,MOVE,MOVE,MOVE
                    ];
                return spawnCreep(role, body);
            }
            
            function spawnCreep(role, body, assignment, subRole, doClaim) {
                const name = role + Game.time;
                for (let i = 0; i < spawns.length; i++) {
                    const result = doSpawn(spawns[i]);
                    if (result == OK) return true;
                }
                return false;
                function doSpawn(spawn) {
                    return spawn.spawnCreep(body, name, { memory: {
                        role: role,
                        assignmentId: assignment ? assignment.id : null,
                        subRole: subRole,
                        homeRoomName: spawn.room.name,
                        assignedRoomName: roomName,
                        doClaim: doClaim
                    }});
                }
            }
            
            function runColonistSpawn() {
                var room = Game.rooms[roomName];
                if (!room) {
                    // we have no visibility in this room. assume it's free to claim and spawn a colonist with a claim part
                    spawnColonists(1, 1);
                }
                else if (!room.controller) {
                    console.log('room ' + roomName + ' cannot be colonized because it does not have a controller');
                }
                else if (room.controller.my) {
                    // controller is mine. spawn colonists without claim parts
                    spawnColonists(2, 0);
                }
                else if (!room.controller.owner && !room.controller.reservation) {
                    // controller is not mine but free to claim. spawn colonists with claim parts
                    spawnColonists(2, 1);
                }
                else {
                    // controller is owned or reserved by another player. spawn a claimer
                    spawnClaimer(true);
                }
            }
            
            function spawnColonists(count, claimParts) {
                if (getCreeps(roomName, 'builder').length >= count) {
                    return;
                }
                var role = 'builder';
                var subRole = 'colonist';
                var body = [
                    WORK,WORK,WORK,WORK,WORK,
                    CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,
                    MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE
                ];
                for (let i = 0; i < claimParts; i++) {
                    body = body.concat([CLAIM]);
                }
                return spawnCreep(role, body, null, subRole);
            }
            
            function spawnClaimer(doClaim) {
                if (getCreeps(roomName, 'claimer').length) {
                    return;
                }
                if (!doClaim && room && room.controller && room.controller.reservation
                && room.controller.reservation.username === username && room.controller.reservation.ticksToEnd > 3500) {
                    // the controller has been reserved for nearly the maximum amount of time. it's pointless to spawn a claimer right now.
                    return;
                }
                var role = 'claimer';
                var body = [CLAIM,CLAIM,CLAIM,MOVE,MOVE,MOVE];
                return spawnCreep(role, body, null, null, doClaim);
            }
            
            function countBodyParts(creep, type) {
               return _.filter(creep.body, o => o.type === type).length; 
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
        
        // function getIsInRecoveryMode(room) {
        //     var hasContainers = room.find(FIND_MY_STRUCTURES, { filter: o => o.structureType == STRUCTURE_CONTAINER }).length > 0;
        //     var hasExtensions = room.find(FIND_MY_STRUCTURES, { filter: o => o.structureType == STRUCTURE_EXTENSION }).length >= 5;
        //     var hasHarvesters = room.find(FIND_MY_CREEPS, { filter: o => o.memory.role === 'harvester' }).length ? 1 : 0;
        //     var hasTransporters = room.find(FIND_MY_CREEPS, { filter: o => o.memory.role === 'transporter' }).length ? 1 : 0;
        //     var hasBuilders = room.find(FIND_MY_CREEPS, { filter: o => o.memory.role === 'builder' }).length ? 1 : 0;
        //     return hasContainers && hasExtensions && (hasHarvesters + hasTransporters + hasBuilders < 2);
        // }
    }
};