export interface ControlDirective {
    roomName: string;
    flagName: string;
    doClaim?: boolean;
    doReserve?: boolean;
}

export function getControlDirectives(): ControlDirective[] {
    return [
        { roomName: 'W17S6', flagName: 'Colony1', doClaim: true },
    ];
}

export function getFlag(roomName: string) {
    const d = getControlDirective(roomName);
    if (!d) return null;
    return Game.flags[d.flagName];
}

export function getDoClaim(roomName: string) {
    const d = getControlDirective(roomName);
    return d && d.doClaim;
}

function getControlDirective(roomName: string): ControlDirective {
    const controlDirectives = getControlDirectives();
    return _.filter(controlDirectives, (o: ControlDirective) => o.roomName === roomName)[0];
}