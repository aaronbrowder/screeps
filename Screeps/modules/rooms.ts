import * as util from './util';
import * as enums from './enums';

export interface ControlDirective {
    roomName: string;
    flagName: string;
    directive: enums.DirectiveConstant;
    raidDirective?: RaidDirective;
    raidWaveMeetupFlagName?: string;
}

export interface RaidDirective {
    targetStructureIds: Array<Id<Structure>>;
    automateTargets: boolean;
    autoDeclareVictory: boolean;
    raiderBodyType: enums.BodyTypeConstant;
    // If maxPotency is set, we will only spawn a limited number of creeps. The creeps
    // will be respawned when they die or are about to die of age.
    // If maxPotency is not set, as many creeps as possible will be spawned until the
    // directive is turned off or until victory is declared.
    maxPotency?: number;
}

export function getControlDirectives(): ControlDirective[] {
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
                    '5bbcac009099fc012e634aa7' as Id<Structure>
                ]
            }
        }
    ];
}

export function getActiveControlDirectives(): ControlDirective[] {
    return util.filter(getControlDirectives(), o => o.directive !== enums.DIRECTIVE_NONE);
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
    if (getDirective(roomName) !== enums.DIRECTIVE_RAID) return false;
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