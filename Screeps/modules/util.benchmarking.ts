
export function initializeBenchmarking() {
    if (!Memory.benchmarks) {
        Memory.benchmarks = {};
    }
    for (let i in Memory.benchmarks) {
        Memory.benchmarks[i].ticks.unshift(initializeTick());
    }
}

export function calculateBenchmarks() {
    for (let i in Memory.benchmarks) {
        const benchmark = Memory.benchmarks[i];
        // only keep the first 100 elements in the array (i.e. the most recent 100 ticks)
        benchmark.ticks = benchmark.ticks.slice(0, 100);
        benchmark.averageCpuPerTick = _.sum(benchmark.ticks, o => o.cpu) / benchmark.ticks.length;
        if (benchmark.ticks[0].cpu > benchmark.highestCpuPerTick) {
            benchmark.highestCpuPerTick = benchmark.ticks[0].cpu;
        }
        //benchmark.averageCpuPerEvent = _.sum(benchmark.ticks, o => o.cpu / o.eventCount) / benchmark.ticks.length;
        Memory.benchmarks[i] = benchmark;
    }
}

export function benchmark<T>(name: string, func: () => T): T {
    const startingCpu = Game.cpu.getUsed();
    const result = func();
    const endingCpu = Game.cpu.getUsed();
    var benchmark = Memory.benchmarks[name];
    if (!benchmark) {
        benchmark = {
            averageCpuPerTick: 0,
            highestCpuPerTick: 0,
            //averageCpuPerEvent: 0,
            ticks: [initializeTick()]
        };
    }
    // the first tick in the array corresponds to the current tick
    benchmark.ticks[0].cpu += endingCpu - startingCpu;
    benchmark.ticks[0].eventCount++;
    Memory.benchmarks[name] = benchmark;
    return result;
}

function initializeTick(): BenchmarkTick {
    return {
        cpu: 0,
        eventCount: 0
    };
}