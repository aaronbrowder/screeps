"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getControlDirectives() {
    return [
        { roomName: 'W17S6', flagName: 'Colony1', doClaim: true },
        { roomName: 'W17S7', flagName: 'Colony2', doClaim: false },
    ];
}
exports.getControlDirectives = getControlDirectives;
function getFlag(roomName) {
    const d = getControlDirective(roomName);
    if (!d)
        return null;
    return Game.flags[d.flagName];
}
exports.getFlag = getFlag;
function getDoClaim(roomName) {
    const d = getControlDirective(roomName);
    return d && d.doClaim;
}
exports.getDoClaim = getDoClaim;
function getControlDirective(roomName) {
    const controlDirectives = getControlDirectives();
    return _.filter(controlDirectives, (o) => o.roomName === roomName)[0];
}
//# sourceMappingURL=rooms.js.map