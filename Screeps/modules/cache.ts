
export function get<T>(key: string, expiresAfter: number, func: () => T, forceRefresh?: boolean): T {
    if (!Memory['cache']) {
        Memory['cache'] = {};
    }
    const timeKey = key + '.time';
    const cache: {} = Memory['cache'];
    let data: T = cache[key];
    const timeRecorded: number = cache[timeKey];
    if (data && timeRecorded >= Game.time - expiresAfter && !forceRefresh) {
        return data;
    }
    data = func();
    cache[key] = data;
    cache[timeKey] = Game.time;
    Memory['cache'] = cache;
    return data;
}