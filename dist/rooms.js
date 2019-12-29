"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const enums = require("./enums");
function getControlDirectives() {
    return [
        { roomName: 'W17S6', flagName: 'Colony1', directive: enums.DIRECTIVE_CLAIM },
        { roomName: 'W17S7', flagName: 'Colony2', directive: enums.DIRECTIVE_RESERVE_AND_HARVEST },
        { roomName: 'W18S5', flagName: 'Colony3', directive: enums.DIRECTIVE_CLAIM },
        { roomName: 'W18S6', flagName: 'Colony4', directive: enums.DIRECTIVE_RESERVE_AND_HARVEST },
        {
            roomName: 'W16S6',
            flagName: 'Lair1',
            directive: enums.DIRECTIVE_NONE,
            raidWaveMeetupFlagName: 'Meetup1',
            raidDirective: {
                maxPotency: 10,
                automateTargets: false,
                autoDeclareVictory: false,
                raiderBodyType: enums.SLAYER,
                targetStructureIds: [
                    '5bbcac009099fc012e634aa7'
                ]
            }
        }
    ];
}
exports.getControlDirectives = getControlDirectives;
function getActiveControlDirectives() {
    return util.filter(getControlDirectives(), o => o.directive !== enums.DIRECTIVE_NONE);
}
exports.getActiveControlDirectives = getActiveControlDirectives;
function getFlag(roomName) {
    const d = getControlDirective(roomName);
    if (!d)
        return null;
    return Game.flags[d.flagName];
}
exports.getFlag = getFlag;
function getRaidWaveMeetupFlagName(roomName) {
    const d = getControlDirective(roomName);
    if (!d)
        return null;
    return d.raidWaveMeetupFlagName;
}
exports.getRaidWaveMeetupFlagName = getRaidWaveMeetupFlagName;
function getRaidWaveMeetupFlag(roomName) {
    const d = getControlDirective(roomName);
    if (!d)
        return null;
    return Game.flags[d.raidWaveMeetupFlagName];
}
exports.getRaidWaveMeetupFlag = getRaidWaveMeetupFlag;
function getDirective(roomName) {
    const d = getControlDirective(roomName);
    if (!d)
        return null;
    return d.directive;
}
exports.getDirective = getDirective;
function getDoRaid(roomName) {
    if (getDirective(roomName) !== enums.DIRECTIVE_RAID)
        return false;
    const roomMemory = Memory.rooms[roomName];
    if (!roomMemory)
        return true;
    return !roomMemory.isConquered;
}
exports.getDoRaid = getDoRaid;
function getRaidDirective(roomName) {
    const d = getControlDirective(roomName);
    if (!d)
        return null;
    return d.raidDirective;
}
exports.getRaidDirective = getRaidDirective;
function getControlDirective(roomName) {
    const controlDirectives = getControlDirectives();
    return _.filter(controlDirectives, (o) => o.roomName === roomName)[0];
}
//# sourceMappingURL=rooms.js.map