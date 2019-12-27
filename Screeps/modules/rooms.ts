import * as util from './util';

type DIRECTIVE_NONE = 0;
type DIRECTIVE_CLAIM = 1;
type DIRECTIVE_RESERVE = 2;
type DIRECTIVE_HARVEST = 3;
type DIRECTIVE_RAID = 4;

export const DIRECTIVE_NONE: DIRECTIVE_NONE = 0;
export const DIRECTIVE_CLAIM: DIRECTIVE_CLAIM = 1;
export const DIRECTIVE_RESERVE: DIRECTIVE_RESERVE = 2;
export const DIRECTIVE_HARVEST: DIRECTIVE_HARVEST = 3;
export const DIRECTIVE_RAID: DIRECTIVE_RAID = 4;

export type DirectiveConstant = DIRECTIVE_NONE | DIRECTIVE_CLAIM | DIRECTIVE_RESERVE | DIRECTIVE_HARVEST | DIRECTIVE_RAID;

export interface ControlDirective {
    roomName: string;
    flagName: string;
    directive: DirectiveConstant;
    raidWaveMeetupFlagName?: string;
}

export function getControlDirectives(): ControlDirective[] {
    return [
        { roomName: 'W17S6', flagName: 'Colony1', directive: DIRECTIVE_CLAIM },
        { roomName: 'W17S7', flagName: 'Colony2', directive: DIRECTIVE_HARVEST },
    ];
}

export function getActiveControlDirectives(): ControlDirective[] {
    return util.filter(getControlDirectives(), o => o.directive !== DIRECTIVE_NONE);
}

export function getFlag(roomName: string) {
    const d = getControlDirective(roomName);
    if (!d) return null;
    return Game.flags[d.flagName];
}

export function getRaidWaveMeetupFlagName(roomName: string) {
    const d = getControlDirective(roomName);
    if (!d) return null;
    return d.raidWaveMeetupFlagName;
}

export function getDirective(roomName: string) {
    const d = getControlDirective(roomName);
    if (!d) return null;
    return d.directive;
}

function getControlDirective(roomName: string): ControlDirective {
    const controlDirectives = getControlDirectives();
    return _.filter(controlDirectives, (o: ControlDirective) => o.roomName === roomName)[0];
}