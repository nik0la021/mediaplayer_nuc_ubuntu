import fs from 'fs';
import { files, deviceModes } from '../utility/constants.js';
import CommandUtility from '../utility/command-util.js';
import FileUtility from '../utility/file-util.js';
import ApiLogger from '../logger/api-logger.js';
import ConfigurationApi from '../api/config-api.js';

class SoftwareConfiguration {
    static async getSoftwareVersion() {
        const packageJsonFile = await FileUtility.readFromFile('./package.json');
        const packageJsonObject = JSON.parse(packageJsonFile);
        return packageJsonObject.version;
    }

    static async getRegistrationData(ethMAC, ipAddress) {
        try {
            const deviceInfo = {
                ipAddress: ipAddress
            };
            const result = await ApiLogger.insertDeviceStatusLog(ethMAC, deviceInfo);

            if (result === null) {
                return {name: 'Not set', company: 'Not set'};
            }
            else {
                await this.createOrUpdateDeviceDataFile(result)
                return {name: result.deviceName, company: result.companyName, deviceMode: result.deviceMode};
            }
        }
        catch(err) {
            let localDeviceData = await this.readDeviceDataFile();
            if(await this.pingServer('8.8.8.8')){
                return {name: localDeviceData.name?localDeviceData.name+' (No server connection)':'No server connection', company: localDeviceData.company?localDeviceData.company+' (No server connection)':'No server connection', deviceMode: localDeviceData.deviceMode?localDeviceData.deviceMode:''}
            }else{
                return {name: localDeviceData.name?localDeviceData.name+' (No connection)':'No connection', company: localDeviceData.company?localDeviceData.company+' (No connection)':'No connection', deviceMode: localDeviceData.deviceMode?localDeviceData.deviceMode:''};
            }
        }
    }

    static async pingServer(address) {
        const commandOutput = await CommandUtility.execCommand(`ping ${address} -c 6 -q | grep "6 packets"`);
        return isPingSuccessful(commandOutput); 
    }

    static async getAllSoftwareData(ethMAC, ipAddress) {
        return {
            version: await this.getSoftwareVersion(),
            registration: await this.getRegistrationData(ethMAC, ipAddress)
        }
    }

    static async createSettingsFile() {
        const defaultSettings = {
            id: 0,
            dateReceived: null,
            statusLogsFrequency: 600,
            apiFrequency: 120,
            screenshotFrequency: 600,
            logFileApiFrequency: 600,
            restartHours: null,
            restartMinutes: null,
            powerOnHours: null,
            powerOnMinutes: null,
            powerOffHours: null,
            powerOffMinutes: null,
            videoPlayerVolume: 100,
            screenshotTtlInMinutes: 300
        };

        if (!fs.existsSync(files.SETTINGS_FILE)) {
            await FileUtility.writeToFile(files.SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
        }
    }

    static async readSettingsFile() {
        const settingsFile = await FileUtility.readFromFile(files.SETTINGS_FILE);
        return JSON.parse(settingsFile);
    }

    static async getDeviceSettings(ethMAC) {
        const result = await ConfigurationApi.getDeviceSettings(ethMAC);
        if(result){
            const settings = parseDeviceSettingsResult(result);
            await FileUtility.writeToFile(files.SETTINGS_FILE, JSON.stringify(settings, null, 2));
        }

        return;
    }

    static async applyDeviceSettings(ethMAC) {
        const settings = await this.readSettingsFile();

        if (settings == {}) {
            return await ApiLogger.insertDeviceSettingsLog(ethMAC, 'error');
        }

        try {
            await configureRestartCron(settings);
            await configurePowerOnCron(settings);
            await configurePowerOffCron(settings);
            await ApiLogger.insertDeviceSettingsLog(ethMAC, 'success');
        }
        catch(err) {
            await ApiLogger.insertDeviceSettingsLog(ethMAC, 'error');
        }

        return;
    }

    static async createOrUpdateDeviceDataFile(result) {
        const deviceData = {
            name: result.deviceName?result.deviceName:'',
            company: result.companyName?result.companyName:'',
            deviceMode: result.deviceMode?result.deviceMode:1
        };

        await FileUtility.writeToFile(files.DEVICE_DATA_FILE, JSON.stringify(deviceData, null, 2));
    }

    static async readDeviceDataFile() {
        if(fs.existsSync(files.DEVICE_DATA_FILE)){
            const deviceDataFile = await FileUtility.readFromFile(files.DEVICE_DATA_FILE);
            return JSON.parse(deviceDataFile);   
        }else{
            return {
                name: '',
                company: '',
                deviceMode: deviceModes.SCREENS
            };
        }
    }

    static async createOrUpdateDeviceConfigShortFile(date, configId, systemVolume) {
        const configJSON = {
            date: date.toISOString(),
            id: configId,
            systemVolume: systemVolume
        };

        await FileUtility.writeToFile(files.DEVICE_CONFIG_SHORT_FILE, JSON.stringify(configJSON, null, 2));
    }

    static async readDeviceConfigShortFile() {
        if(fs.existsSync(files.DEVICE_CONFIG_SHORT_FILE)){
            const deviceConfigDateFile = await FileUtility.readFromFile(files.DEVICE_CONFIG_SHORT_FILE);
            let result = JSON.parse(deviceConfigDateFile)
            let configJSON = {
                date: result.date,
                id: result.id,
                systemVolume: result.systemVolume
            }
            return configJSON;   
        }else{
            return {};
        }
    }
}

function isPingSuccessful(pingOutput) {
    return pingOutput !== undefined && pingOutput.includes('6 packets transmitted') && !pingOutput.includes('100% packet loss')
    ? true : false;
}

function parseDeviceSettingsResult(result) {
    if (result === null) {
        return {
            id: 0,
            dateReceived: null,
            statusLogsFrequency: 600,
            apiFrequency: 120,
            screenshotFrequency: 600,
            logFileApiFrequency: 600,
            restartHours: null,
            restartMinutes: null,
            powerOnHours: null,
            powerOnMinutes: null,
            powerOffHours: null,
            powerOffMinutes: null,
            videoPlayerVolume: 100,
            screenshotTtlInMinutes: 300
        };
    }

    return {
        id: result.id,
        dateReceived: result.dateReceived,
        statusLogsFrequency: result.statusLogsFrequency && result.statusLogsFrequency>60?result.statusLogsFrequency:60,
        apiFrequency: result.apiFrequency && result.apiFrequency>20?result.apiFrequency:20,
        screenshotFrequency: result.screenshotFrequency && result.screenshotFrequency>300?result.screenshotFrequency:300,
        logFileApiFrequency: result.logFileApiFrequency && result.logFileApiFrequency>600?result.logFileApiFrequency:600,
        restartHours: result.restartHours,
        restartMinutes: result.restartMinutes,
        powerOnHours: result.powerOnHours,
        powerOnMinutes: result.powerOnMinutes,
        powerOffHours: result.powerOffHours,
        powerOffMinutes: result.powerOffMinutes,
        videoPlayerVolume: result.videoPlayerVolume && result.videoPlayerVolume<0 ? 0 : (result.videoPlayerVolume && result.videoPlayerVolume>100 ? 100 : (result.videoPlayerVolume ? result.videoPlayerVolume : 100) ),
        screenshotTtlInMinutes: result.screenshotTtlInMinutes && result.screenshotTtlInMinutes<30? 30 : (result.screenshotTtlInMinutes && result.screenshotTtlInMinutes>300 ? 300 : (result.screenshotTtlInMinutes? result.screenshotTtlInMinutes: 300))
    }
}

async function configureRestartCron(settings) {
    if (settings.restartMinutes !==  null && settings.restartHours !== null) {
        const crontabCommand = `${settings.restartMinutes} ${settings.restartHours} * * * root /usr/local/bin/node ${files.RESTART_SCRIPT}\n`;
        await FileUtility.writeToFile(files.RESTART_CRON_FILE, crontabCommand);
    }
    else if (fs.existsSync(files.RESTART_CRON_FILE) && (settings.restartMinutes === null || settings.restartHours === null)) {
        await FileUtility.deleteFile(files.RESTART_CRON_FILE);
    }

    return;
}

async function configurePowerOnCron(settings) {
    if (settings.powerOnMinutes !== null && settings.powerOnHours !== null) {
        await FileUtility.writeToFile(files.POWER_ON_CRON_FILE, crontabCommand);
    }
    else if (fs.existsSync(files.POWER_ON_CRON_FILE) && (settings.powerOnMinutes === null || settings.powerOnHours === null)) {
        await FileUtility.deleteFile(files.POWER_ON_CRON_FILE);
    }

    return;
}

async function configurePowerOffCron(settings) {
    if (settings.powerOffMinutes !== null && settings.powerOffHours !== null) {
        // const crontabCommand = `${settings.powerOffMinutes} ${settings.powerOffHours} * * * root /usr/bin/vcgencmd display_power 0 > ${DISPLAY_OFF_LOG_FILE} 2>&1\n`;
        const crontabCommand = `${settings.powerOffMinutes} ${settings.powerOffHours} * * * root /usr/local/bin/node ${files.DISPLAY_OFF_SCRIPT}\n`;
        await FileUtility.writeToFile(files.POWER_OFF_CRON_FILE, crontabCommand);
    }
    else if (fs.existsSync(files.POWER_OFF_CRON_FILE) && (settings.powerOffMinutes === null || settings.powerOffHours === null)) {
        await FileUtility.deleteFile(files.POWER_OFF_CRON_FILE);
    }

    return;
}

export default SoftwareConfiguration;