const LINK_SOURCE = 1;
const LINK_DESTINATION = 2;

module.exports = {
    runAll: function() {
        
        // only do this calculation once every 5 ticks to save CPU
        if (Game.time % 5 !== 0) return;
        
        for (let i in Game.structures) {
            const structure = Game.structures[i];
            
            if (structure.structureType != STRUCTURE_LINK) continue;
            const sourceLink = structure;
            
            if (sourceLink.energy === 0) continue;
            
            // if there are no empty links in the room, there's nowhere to transfer to
            var otherLinks = sourceLink.room.find(FIND_STRUCTURES, { filter: o => o.structureType == STRUCTURE_LINK && o !== sourceLink });
            if (otherLinks.every(o => o.energy === o.energyCapacity)) return;
            
            const destinationLinks = {};
            const spawnsInRoom = sourceLink.room.find(FIND_MY_SPAWNS);
            for (let j in spawnsInRoom) {
                const spawn = spawnsInRoom[j];
                const closestLink = spawn.pos.findClosestByPath(FIND_STRUCTURES, { filter: o => o.structureType == STRUCTURE_LINK });
                if (closestLink) {
                    destinationLinks[closestLink.id] = (destinationLinks[closestLink.id] || 0) + 1;
                }
            }
            var bestId = 0;
            var bestCount = 0;
            for (let id in destinationLinks) {
                if (destinationLinks[id] > bestCount) {
                    bestId = id;
                    bestCount = destinationLinks[id];
                }
            }
            const destinationLink = Game.getObjectById(bestId);
            if (destinationLink && destinationLink !== sourceLink && destinationLink.energy < destinationLink.energyCapacity) {
                sourceLink.transferEnergy(destinationLink);
                markLinksInMemory(sourceLink, destinationLink);
            }
        }
        
        function markLinksInMemory(sourceLink, destinationLink) {
            if (!Memory.links) Memory.links = {};
            Memory.links[sourceLink.id] = LINK_SOURCE;
            Memory.links[destinationLink.id] = LINK_DESTINATION;
        }
    },
    
    isSource: function(link) {
        // treat unmarked links as sources
        return !Memory.links[link.id] || Memory.links[link.id] === LINK_SOURCE;
    },
    
    isDestination: function(link) {
        return Memory.links[link.id] === LINK_DESTINATION;
    }
};