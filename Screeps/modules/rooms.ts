export interface ControlDirective {
    roomName: string;
    flagName: string;
    doClaim?: boolean;
    doReserve?: boolean;
}

export function getControlDirectives(): ControlDirective[] {
    return [
        { roomName: 'E44N31', flagName: 'Colony1', doClaim: true },
        { roomName: 'E44N32', flagName: 'Colony2', doClaim: true },
        { roomName: 'E45N31', flagName: 'Colony3', doClaim: true },
        { roomName: 'E45N32', flagName: 'Colony4', doReserve: true },
        { roomName: 'E43N32', flagName: 'Colony5', doReserve: true },
        { roomName: 'E42N32', flagName: 'Colony6', doClaim: true }
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