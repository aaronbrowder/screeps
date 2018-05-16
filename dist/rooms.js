"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getControlDirectives() {
    return [
        { roomName: 'E44N31', flagName: 'Colony1', doClaim: true },
        { roomName: 'E44N32', flagName: 'Colony2', doClaim: true },
        { roomName: 'E45N31', flagName: 'Colony3', doClaim: true },
        { roomName: 'E45N32', flagName: 'Colony4', doReserve: true },
        { roomName: 'E43N32', flagName: 'Colony5', doReserve: true },
        { roomName: 'E42N32', flagName: 'Colony6', doClaim: true },
        { roomName: 'E43N31', flagName: 'Colony7', doReserve: true },
        { roomName: 'E41N32', flagName: 'Colony8', doReserve: true },
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