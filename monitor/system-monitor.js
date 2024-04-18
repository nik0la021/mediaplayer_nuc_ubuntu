import { totalmem, freemem, cpus } from 'os';
import { check } from 'diskusage';
import CommandUtility from '../utility/command-util.js';

const ROUND_PRECISION = 1000;

class SystemMonitor {
    static async getCpuUsage(interval) {
        const startMeasure = calculateCpuAverageOnAllCores();
        await CommandUtility.pauseExecution(interval);
        const endMeasure = calculateCpuAverageOnAllCores();

        const idleTimeDifference = endMeasure.idle - startMeasure.idle;
        const totalTimeDifference = endMeasure.total - startMeasure.total;

        const idleTimeQuotient = idleTimeDifference / totalTimeDifference;
        const idleTimePercentage = 100 * roundNumber(idleTimeQuotient);
        
        const cpuPercentage = 100 - idleTimePercentage;
        return cpuPercentage;
    }

    static async getUsedMemory() {
        const totalMemoryInBytes = totalmem();
        const freeMemoryInBytes = freemem();

        const usedMemoryInBytes = totalMemoryInBytes - freeMemoryInBytes;
        const usedMemoryInGigabytes = roundNumber(usedMemoryInBytes * Math.pow(2, -30));
        const totalMemoryInGigabytes = roundNumber(totalMemoryInBytes * Math.pow(2, -30));

        const usedMemoryQuotient = usedMemoryInBytes / totalMemoryInBytes;
        const usedMemoryPercentage = 100 * roundNumber(usedMemoryQuotient);

        return {used: usedMemoryInGigabytes, total: totalMemoryInGigabytes, percent: usedMemoryPercentage};
    }

    static async getUsedDisk() {
        try {
           const path = '/';
           const { free, total } = await check(path);

           const usedDiskSpaceinBytes =  total - free;
           const usedDiskSpaceinGigabytes = roundNumber(usedDiskSpaceinBytes * Math.pow(2, -30));
           const totalDiskSpaceinGigabytes = roundNumber(total * Math.pow(2, -30));

           const usedDiskQuotient = usedDiskSpaceinBytes / total;
           const usedDiskPercentage = 100 * roundNumber(usedDiskQuotient);

           return {used: usedDiskSpaceinGigabytes, total: totalDiskSpaceinGigabytes, percent: usedDiskPercentage};
        }
        catch(err) {
            return {used: 'N/A', total: 'N/A', percent: 'N/A'};
        }
    }

    static async getCPUTemperature() {
        try {
            const output = await execCommand(`cat /sys/class/thermal/thermal_zone2/temp`);
            const tempInCelsiusDegrees = parseFloat(output) / 1000;

            return tempInCelsiusDegrees;
        }
        catch(err) {
            return null;
        }
    }

    static async getGPUTemperature() {
        try {
            const output = await execCommand(`cat /sys/class/thermal/thermal_zone1/temp`);
            const tempInCelsiusDegrees = parseFloat(output) / 1000;

            return tempInCelsiusDegrees;
        }
        catch(err) {
            return null;
        }
    }

    static async getStatus(cpuInterval) {
        return {
            cpu: await this.getCpuUsage(cpuInterval),
            ram: await this.getUsedMemory(),
            disk: await this.getUsedDisk(),
            cpuTemp: await this.getCPUTemperature(),
            gpuTemp: await this.getGPUTemperature()
        }
    }
}

function calculateCpuAverageOnAllCores() {
    let totalIdleTime = 0;
    let totalTime = 0;

    const cpuCores = cpus();
    cpuCores.forEach(core => {
        for (const type in core.times) {
            totalTime += core.times[type];
        }

        totalIdleTime += core.times.idle;
    });

    return {
        idle: totalIdleTime / cpuCores.length, 
        total: totalTime / cpuCores.length
    }
}

function roundNumber(number) {
    return (Math.round(ROUND_PRECISION * number + Number.EPSILON) / ROUND_PRECISION);
}

export default SystemMonitor;