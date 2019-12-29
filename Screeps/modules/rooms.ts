import * as util from './util';

type DIRECTIVE_NONE = 0;
type DIRECTIVE_CLAIM = 1;
type DIRECTIVE_RESERVE = 2;
type DIRECTIVE_HARVEST = 3;
type DIRECTIVE_RAID = 4;
type DIRECTIVE_RESERVE_AND_HARVEST = 5;

export const DIRECTIVE_NONE: DIRECTIVE_NONE = 0;
export const DIRECTIVE_CLAIM: DIRECTIVE_CLAIM = 1;
export const DIRECTIVE_RESERVE: DIRECTIVE_RESERVE = 2;
export const DIRECTIVE_HARVEST: DIRECTIVE_HARVEST = 3;
export const DIRECTIVE_RAID: DIRECTIVE_RAID = 4;
export const DIRECTIVE_RESERVE_AND_HARVEST: DIRECTIVE_RESERVE_AND_HARVEST = 5;

export type DirectiveConstant =
    DIRECTIVE_NONE |
    DIRECTIVE_CLAIM |
    DIRECTIVE_RESERVE |
    DIRECTIVE_HARVEST |
    DIRECTIVE_RAID |
    DIRECTIVE_RESERVE_AND_HARVEST;

export interface ControlDirective {
    roomName: string;
    flagName: string;
    directive: DirectiveConstant;
    raidDirective?: RaidDirective;
    raidWaveMeetupFlagName?: string;
}

export interface RaidDirective {
    targetStructureIds: Array<Id<Structure>>;
}

export function getControlDirectives(): ControlDirective[] {
    return [
        { roomName: 'W17S6', flagName: 'Colony1', directive: DIRECTIVE_CLAIM },
        { roomName: 'W17S7', flagName: 'Colony2', directive: DIRECTIVE_HARVEST },
        { roomName: 'W18S5', flagName: 'Colony3', directive: DIRECTIVE_NONE },
        { roomName: 'W18S6', flagName: 'Colony4', directive: DIRECTIVE_RESERVE_AND_HARVEST },
        //{
        //    roomName: 'W18S5',
        //    flagName: 'Colony3',
        //    directive: DIRECTIVE_RAID,
        //    raidWaveMeetupFlagName: 'Meetup1',
        //    raidDirective: {
        //        targetStructureIds: [
        //            //'5dfd81b4d7c51483382f94df' as Id<Structure>, // Spawn
        //            '5dffba4029303d1acf3e0f38' as Id<Structure>  // Tower 
        //        ]
        //    }
        //}
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

export function getRaidWaveMeetupFlag(roomName: string) {
    const d = getControlDirective(roomName);
    if (!d) return null;
    return Game.flags[d.raidWaveMeetupFlagName];
}

export function getDirective(roomName: string) {
    const d = getControlDirective(roomName);
    if (!d) return null;
    return d.directive;
}

export function getDoRaid(roomName: string) {
    if (getDirective(roomName) !== DIRECTIVE_RAID) return false;
    const roomMemory = Memory.rooms[roomName];
    if (!roomMemory) return true;
    return !roomMemory.isConquered;
}

export function getRaidDirective(roomName: string) {
    const d = getControlDirective(roomName);
    if (!d) return null;
    return d.raidDirective;
}

function getControlDirective(roomName: string): ControlDirective {
    const controlDirectives = getControlDirectives();
    return _.filter(controlDirectives, (o: ControlDirective) => o.roomName === roomName)[0];
}