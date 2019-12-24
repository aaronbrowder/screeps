import * as util from './util';

const LINK_SOURCE = 1;
const LINK_DESTINATION = 2;

export function runAll() {

    // only do this calculation once every 3 ticks to save CPU
    if (Game.time % 3 !== 0) return;

    const sourceLinks: StructureLink[] = _.filter(Game.structures, o => {
        return util.isLink(o) && o.energy > 0 && o.cooldown === 0 && !decideIsDestination(o);
    });

    for (let i in sourceLinks) {
        const sourceLink = sourceLinks[i];

        const destinationLinks = sourceLink.room.find<StructureLink>(FIND_MY_STRUCTURES, {
            filter: o => util.isLink(o) && o !== sourceLink && decideIsDestination(o) && o.energy < o.energyCapacity
        });

        // pick the destination link with the lowest energy
        const destinationLink = util.sortBy(destinationLinks, o => o.energy)[0];

        if (destinationLink) {
            sourceLink.transferEnergy(destinationLink);
            markLinksInMemory(sourceLink, destinationLink);
        }
    }
}

function decideIsDestination(link: StructureLink) {
    // a link is considered a destination if it is within 2 spaces of a storage unit
    return link.pos.findInRange(FIND_STRUCTURES, 2, { filter: o => util.isStorage(o) }).length > 0;
}

function markLinksInMemory(sourceLink: StructureLink, destinationLink: StructureLink) {
    if (!Memory['links']) Memory['links'] = {};
    Memory['links'][sourceLink.id] = LINK_SOURCE;
    Memory['links'][destinationLink.id] = LINK_DESTINATION;
}

export function isSource(link: StructureLink) {
    // treat unmarked links as sources
    if (!Memory['links']) Memory['links'] = {};
    return !Memory['links'][link.id] || Memory['links'][link.id] === LINK_SOURCE;
}

export function isDestination(link: StructureLink) {
    if (!Memory['links']) Memory['links'] = {};
    return Memory['links'][link.id] === LINK_DESTINATION;
}