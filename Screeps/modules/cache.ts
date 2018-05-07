
export function get<T>(key: string, expiresAfter: number, func: () => T): T {
    if (!Memory['cache']) {
        Memory['cache'] = {};
    }
    const timeKey = key + '.time';
    const cache: {} = Memory['cache'];
    let data: T = cache[key];
    const timeRecorded: number = cache[timeKey];
    if (data && timeRecorded >= Game.time - expiresAfter) {
        return data;
    }
    data = func();
    cache[key] = data;
    cache[timeKey] = Game.time;
    Memory['cache'] = cache;
    return data;
}