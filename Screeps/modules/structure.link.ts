import * as util from './util';

const LINK_SOURCE = 1;
const LINK_DESTINATION = 2;

export function runAll() {

    // only do this calculation once every 5 ticks to save CPU
    if (Game.time % 5 !== 0) return;

    const allLinks: Link[] = _.filter(Game.structures, (o: Structure) => o.structureType === STRUCTURE_LINK);

    for (let i in allLinks) {
        const sourceLink = allLinks[i];

        if (sourceLink.energy === 0) continue;

        // if there are no empty links in the room, there's nowhere to transfer to
        var otherLinks = sourceLink.room.find<StructureLink>(FIND_MY_STRUCTURES, { filter: o => o.structureType == STRUCTURE_LINK && o !== sourceLink });
        if (otherLinks.every(o => o.energy === o.energyCapacity)) continue;

        const destinationLinks = {};
        const spawnsInRoom = sourceLink.room.find<StructureSpawn>(FIND_MY_SPAWNS);
        for (let j in spawnsInRoom) {
            const spawn = spawnsInRoom[j];
            const closestLink = spawn.pos.findClosestByPath<StructureLink>(FIND_MY_STRUCTURES, { filter: o => o.structureType == STRUCTURE_LINK });
            if (closestLink) {
                destinationLinks[closestLink.id] = (destinationLinks[closestLink.id] || 0) + 1;
            }
        }
        var bestId = '0';
        var bestCount = 0;
        for (let id in destinationLinks) {
            if (destinationLinks[id] > bestCount) {
                bestId = id;
                bestCount = destinationLinks[id];
            }
        }
        const destinationLink = Game.getObjectById<StructureLink>(bestId);
        if (destinationLink && destinationLink !== sourceLink && destinationLink.energy < destinationLink.energyCapacity) {
            sourceLink.transferEnergy(destinationLink);
            markLinksInMemory(sourceLink, destinationLink);
        }
    }

    function markLinksInMemory(sourceLink, destinationLink) {
        if (!Memory['links']) Memory['links'] = {};
        Memory['links'][sourceLink.id] = LINK_SOURCE;
        Memory['links'][destinationLink.id] = LINK_DESTINATION;
    }
}

export function isSource(link) {
    // treat unmarked links as sources
    if (!Memory['links']) Memory['links'] = {};
    return !Memory['links'][link.id] || Memory['links'][link.id] === LINK_SOURCE;
}

export function isDestination(link) {
    if (!Memory['links']) Memory['links'] = {};
    return Memory['links'][link.id] === LINK_DESTINATION;
}