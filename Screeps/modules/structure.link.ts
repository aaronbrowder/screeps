import * as util from './util';
import * as enums from './enums';

export function runAll() {
    if (!Memory.links) Memory.links = {};
    if (Game.time % 3 === 0) {
        for (let i in Game.rooms) {
            const room = Game.rooms[i];
            const links = util.findLinks(room);
            determineLinkTypes(links);
            sendEnergy(links);
        }
    }
}

function determineLinkTypes(links: Array<StructureLink>) {
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const linkType = determineLinkType(link);
        Memory.links[link.id] = linkType;
    }
}

function sendEnergy(links: Array<StructureLink>) {
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const linkType = getLinkType(link);
        if (link.energy > 0 && link.cooldown === 0 && linkType !== enums.LINK_DESTINATION) {
            const nonFullLinks = util.filter(links, o => o.energy < o.energyCapacity);
            const destinations = util.filter(nonFullLinks, o => getLinkType(o) === enums.LINK_DESTINATION);
            if (linkType === enums.LINK_SOURCE) {
                // this is a source, so we can send to a destination (1st priority) or a hub (2nd priority)
                if (destinations.length) {
                    link.transferEnergy(destinations[0]);
                } else {
                    const hubLinks = util.filter(nonFullLinks, o => getLinkType(o) === enums.LINK_HUB);
                    if (hubLinks.length) {
                        link.transferEnergy(hubLinks[0]);
                    }
                }
            }
            else if (linkType === enums.LINK_HUB) {
                // this is a hub link, so we can only send to destinations
                if (destinations.length) {
                    link.transferEnergy(destinations[0]);
                }
            }
        }
    }
}

function getLinkType(link: StructureLink): LinkType {
    return Memory.links[link.id];
}

function determineLinkType(link: StructureLink): LinkType {
    if (isNearHub(link)) return enums.LINK_HUB;
    if (isNearController(link)) return enums.LINK_DESTINATION;
    return enums.LINK_SOURCE;
}

function isNearHub(link: StructureLink) {
    const hubFlag = util.findHubFlag(link.room);
    return hubFlag && hubFlag.pos.inRangeTo(link, 1);
}

function isNearController(link: StructureLink) {
    return link.pos.findInRange(FIND_STRUCTURES, 4, { filter: o => util.isController(o) }).length > 0;
}