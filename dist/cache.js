"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function get(key, expiresAfter, func, forceRefresh) {
    if (!Memory['cache']) {
        Memory['cache'] = {};
    }
    const timeKey = key + '.time';
    const cache = Memory['cache'];
    let data = cache[key];
    const timeRecorded = cache[timeKey];
    if (data && timeRecorded >= Game.time - expiresAfter && !forceRefresh) {
        return data;
    }
    data = func();
    cache[key] = data;
    cache[timeKey] = Game.time;
    Memory['cache'] = cache;
    return data;
}
exports.get = get;
//# sourceMappingURL=cache.js.map