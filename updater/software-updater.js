const fs = require('fs');
const SoftwareVersionApi = require('../api/update-api');
const LogApi = require('../api/log-api');
const ApiLogger = require('../logger/api-logger');
const NetworkApi = require('../api/network-api');
const NetworkConfiguration = require('../configuration/network-config');
const SystemMonitor = require('../monitor/system-monitor');
const commandUtility = require('../utility/command-util');
const fileUtility = require('../utility/file-util');
const device = require('../utility/constants').device;
const api = require('../utility/constants').api;
const folders = require('../utility/constants').folders;

const PLAYER_SCRIPT_FOLDER = folders.PLAYER_SCRIPT_FOLDER;
const SOFTWARE_VERSION_FOLDER = folders.SOFTWARE_VERSION_FOLDER;
const SOFTWARE_VERSION_FILE = `${SOFTWARE_VERSION_FOLDER}/player-script.tar.gz`;
const FREE_DISK_LIMIT_IN_GB = 2;

const CHECK_SUCCESS = 'success';

const systemMonitor = new SystemMonitor();
const softwareVersionApi = new SoftwareVersionApi();
const logApi = new LogApi();
const logger = new ApiLogger(logApi, systemMonitor);
const networkApi = new NetworkApi();
const networkConfig = new NetworkConfiguration(networkApi, logger);

function createSoftwareVersionFolder() {
    if (!fs.existsSync(SOFTWARE_VERSION_FOLDER)) {
        fs.mkdirSync(SOFTWARE_VERSION_FOLDER);
    }
}

async function deleteSoftwareVersionFolder() {
    return await commandUtility.execCommand(`rm -rf ${SOFTWARE_VERSION_FOLDER}`);
}

async function getNewSoftwareVersion(ethMAC) {
    const softwareVersionInfo = await softwareVersionApi.getNewSoftwareVersion(ethMAC);
    return softwareVersionInfo;
}

async function checkSoftwareVersionSize(ethMAC, softwareVersionInfo) {
    if (softwareVersionInfo === null) {
        await logger.insertGetNewSoftwareVersionLog(ethMAC, 'error');
        return null;
    }
    await logger.insertGetNewSoftwareVersionLog(ethMAC, 'success');

    const diskUsage = await systemMonitor.getUsedDisk();
    const freeDiskSpaceInGigabytes = diskUsage.total - diskUsage.used;
    const freeDiskSpaceWithSoftwareVersion = freeDiskSpaceInGigabytes - softwareVersionInfo.size;

    if (freeDiskSpaceWithSoftwareVersion < FREE_DISK_LIMIT_IN_GB) {
        await logger.insertSoftwareVersionSizeLog(ethMAC, 'error');
        return null;
    }
    await logger.insertSoftwareVersionSizeLog(ethMAC, 'success');
    return CHECK_SUCCESS;
}

async function downloadSoftwareVersionArchive(ethMAC, softwareVersionInfo) {
    const result = await softwareVersionApi.downloadSoftwareVersion(softwareVersionInfo.downloadLink, SOFTWARE_VERSION_FILE);
    if (result.status === api.STATUS.ERROR) {
        await logger.insertSoftwareVersionDownloadLog(ethMAC, 'error');
        return null;
    }
    else if (result.status === api.STATUS.SUCCESS) {
        await logger.insertSoftwareVersionDownloadLog(ethMAC, 'success');
        return CHECK_SUCCESS;
    }
}

async function checkSoftwareVersionIntegrity(ethMAC, softwareVersionInfo) {
    const result = await fileUtility.calculateFileChecksum('md5', SOFTWARE_VERSION_FILE);
    if (result.status === 'error') {
        await logger.insertSoftwareVersionChecksumLog(ethMAC, 'error');
        return null;
    }
    else if (result.status === 'success') {
        await logger.insertSoftwareVersionChecksumLog(ethMAC, 'success');
        return softwareVersionInfo.checksum === result.data;
    }
}

async function extractSoftwareVersionArchive() {
    const commandOutput = await commandUtility.execCommand(`tar -xzf ${SOFTWARE_VERSION_FILE} --directory="${SOFTWARE_VERSION_FOLDER}"`);

    return commandOutput.includes('Error') ? null : CHECK_SUCCESS;
}

async function installNpmPackages(ethMAC, folderPath, packageType) {
    const commandOutput = await commandUtility.execCommand(`cd ${folderPath} && npm install`);

    if (commandOutput.includes('Error') || commandOutput.includes('ERR!')) {
        await logger.insertSoftwareVersionPackagesLog(ethMAC, 'error', packageType);
        return null;
    }
    else {
        await logger.insertSoftwareVersionPackagesLog(ethMAC, 'success', packageType);
        return CHECK_SUCCESS;
    }
}

async function buildStartupClient(ethMAC, folderPath) {
    const commandOutput = await commandUtility.execCommand(`cd ${folderPath} && npm run build`);

    if (commandOutput.includes('Failed')) {
        await logger.insertSoftwareVersionBuildLog(ethMAC, 'error');
        return null;
    }
    else {
        await logger.insertSoftwareVersionBuildLog(ethMAC, 'success');
        return CHECK_SUCCESS;
    }
}

async function deleteOldScriptFolder() {
    return await commandUtility.execCommand(`rm -rf ${PLAYER_SCRIPT_FOLDER}`);
}

function createNewScriptFolder() {
    if (!fs.existsSync(PLAYER_SCRIPT_FOLDER)) {
        fs.mkdirSync(PLAYER_SCRIPT_FOLDER);
    }
}

async function moveFilesToScriptFolder() {
    await fileUtility.deleteFile(SOFTWARE_VERSION_FILE);
    return await commandUtility.execCommand(`mv ${SOFTWARE_VERSION_FOLDER}/* ${PLAYER_SCRIPT_FOLDER}`);
}

async function startUpdaterScript() {
    const ethMAC = await networkConfig.getMACAddress(device.ETH_INTERFACE);
    await deleteSoftwareVersionFolder();
    createSoftwareVersionFolder();

    const softwareVersionInfo = await getNewSoftwareVersion(ethMAC);
    if (!softwareVersionInfo) {
        return;
    }

    const sizeLimitCheck = await checkSoftwareVersionSize(ethMAC, softwareVersionInfo);
    if (!sizeLimitCheck) {
        await logger.insertSoftwareVersionInstallLog(ethMAC, 'error');
        return;
    }

    const downloadCheck = await downloadSoftwareVersionArchive(ethMAC, softwareVersionInfo);
    if (!downloadCheck) {
        await logger.insertSoftwareVersionInstallLog(ethMAC, 'error');
        return;
    }

    const integrityCheck = await checkSoftwareVersionIntegrity(ethMAC, softwareVersionInfo);
    if (!integrityCheck) {
        await logger.insertSoftwareVersionInstallLog(ethMAC, 'error');
        return;
    }

    const extractArchiveCheck = await extractSoftwareVersionArchive();
    if (!extractArchiveCheck) {
        await logger.insertSoftwareVersionInstallLog(ethMAC, 'error');
        return;
    }

    const installMainPackagesCheck = await installNpmPackages(ethMAC, SOFTWARE_VERSION_FOLDER, 'main');
    if (!installMainPackagesCheck) {
        await logger.insertSoftwareVersionInstallLog(ethMAC, 'error');
        return;
    }

    const startupClientFolderPath = `${SOFTWARE_VERSION_FOLDER}/startup/startup-client`;
    const installStartupPackagesCheck = await installNpmPackages(ethMAC, startupClientFolderPath, 'startup');
    if (!installStartupPackagesCheck) {
        await logger.insertSoftwareVersionInstallLog(ethMAC, 'error');
        return;
    }

    const buildStartupClientCheck = await buildStartupClient(ethMAC, startupClientFolderPath);
    if (!buildStartupClientCheck) {
        await logger.insertSoftwareVersionInstallLog(ethMAC, 'error');
        return;
    }

    await deleteOldScriptFolder();
    createNewScriptFolder();
    await moveFilesToScriptFolder();
    await deleteSoftwareVersionFolder();
    await logger.insertSoftwareVersionInstallLog(ethMAC, 'success');
}

setTimeout(async () => {
    await startUpdaterScript();
}, 10000);