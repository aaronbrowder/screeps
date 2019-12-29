"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const LINK_SOURCE = 1;
const LINK_DESTINATION = 2;
function runAll() {
    // only do this calculation once every 3 ticks to save CPU
    if (Game.time % 3 !== 0)
        return;
    const sourceLinks = _.filter(Game.structures, o => {
        return util.isLink(o) && o.energy > 0 && o.cooldown === 0 && !decideIsDestination(o);
    });
    for (let i in sourceLinks) {
        const sourceLink = sourceLinks[i];
        const destinationLinks = sourceLink.room.find(FIND_MY_STRUCTURES, {
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
exports.runAll = runAll;
function decideIsDestination(link) {
    // if the link is near a controller, it's a destination link
    if (isNearController(link))
        return true;
    // if there's only one other link in the room and it's near a controller, this link must be a source link
    const otherLinksInRoom = link.room.find(FIND_STRUCTURES, { filter: o => util.isLink(o) && o.id !== link.id });
    if (otherLinksInRoom.length === 1 && util.any(otherLinksInRoom, o => isNearController(o))) {
        return false;
    }
    // otherwise, this is a destination link if it's near storage
    return link.pos.findInRange(FIND_STRUCTURES, 2, { filter: o => util.isStorage(o) }).length > 0;
}
function isNearController(link) {
    return link.pos.findInRange(FIND_STRUCTURES, 4, { filter: o => util.isController(o) }).length > 0;
}
exports.isNearController = isNearController;
function markLinksInMemory(sourceLink, destinationLink) {
    if (!Memory['links'])
        Memory['links'] = {};
    Memory['links'][sourceLink.id] = LINK_SOURCE;
    Memory['links'][destinationLink.id] = LINK_DESTINATION;
}
function isSource(link) {
    // treat unmarked links as sources
    if (!Memory['links'])
        Memory['links'] = {};
    return !Memory['links'][link.id] || Memory['links'][link.id] === LINK_SOURCE;
}
exports.isSource = isSource;
function isDestination(link) {
    if (!Memory['links'])
        Memory['links'] = {};
    return Memory['links'][link.id] === LINK_DESTINATION;
}
exports.isDestination = isDestination;
//# sourceMappingURL=structure.link.js.map