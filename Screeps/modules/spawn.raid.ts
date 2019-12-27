import * as rooms from './rooms';

/* 1. Get the raid target room
 * 2. Make sure the target room is not already captured
 * 3. Make a list of spawns that are close enough to help spawn our wave
 * 4. Figure out how big of a wave we can spawn using all those spawns (before the creeps start dying of age)
 * 5. Make sure the spawns are ready (i.e. they don't have a lot of other work to do and have enough energy in storage)
 * 6. Return a value indicating the wave size
*/

// Note: we will also need a way to message the creeps when the wave is finished spawning so they can begin the raid
// Another note: we will also need to cancel wave spawning, and recycle wave creeps, once the target room is conquered

export function getWaveSize(roomName: string) {
    const meetupFlagName = rooms.getRaidWaveMeetupFlagName(roomName);
    if (!meetupFlagName || !Game.flags[meetupFlagName]) {
        console.warn('Can\'t spawn raid wave without a meetup flag (target room ' + roomName + ')');
        return 0;
    }
    return 0;
}

export function createWave() {
    if (!Memory.raidWaves) {
        Memory.raidWaves = [];
    }
    const wave: RaidWave = {
        id: Game.time
    };
    Memory.raidWaves.push(wave);
    return wave.id;
}

