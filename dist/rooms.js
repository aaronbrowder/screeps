"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const enums = require("./enums");
function getControlDirectives() {
    return [
        { roomName: 'W9S4', flagName: 'Colony1', directive: enums.DIRECTIVE_CLAIM },
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