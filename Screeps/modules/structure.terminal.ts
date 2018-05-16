import * as util from './util';

export function run(terminal: Terminal) {

    if (terminal.cooldown) return;

    if (canSendEnergy(terminal)) {
        const otherTerminals = util.filter(findOtherTerminals(2), o => canReceiveEnergy(o));
        if (otherTerminals.length) {
            const receiveTarget = util.sortBy(otherTerminals, o => o.store[RESOURCE_ENERGY])[0];
            const result = terminal.send(RESOURCE_ENERGY, 50000, receiveTarget.room.name);
            console.log('Terminal in ' + terminal.room.name + ' is sending to ' + receiveTarget.room.name + '. Result: ' + result);
        }
    }

    function findOtherTerminals(range: number): Terminal[] {
        return _.filter(Game.structures, o => {
            return util.isTerminal(o)
                && o.id !== terminal.id
                && Game.map.getRoomLinearDistance(o.room.name, terminal.room.name) <= range;
        });
    }
}

function canSendEnergy(terminal: Terminal) {
    // if in consumption mode, the terminal wants to get rid of energy
    const energy: number = terminal.store[RESOURCE_ENERGY];
    return energy > 100000 && getIsConsumptionMode(terminal);
}

function canReceiveEnergy(terminal: Terminal) {
    // if in consumption mode, the terminal wants to accumulate energy
    const energy: number = terminal.store[RESOURCE_ENERGY];
    return energy < 10000 || (energy < 200000 && !getIsConsumptionMode(terminal));
}

function getIsConsumptionMode(terminal: Terminal): boolean {
    return util.getRoomMemory(terminal.room.name).consumptionMode;
}