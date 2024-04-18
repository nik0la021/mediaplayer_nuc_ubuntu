import fs from "fs";
import { folders, log, device, api } from "../utility/constants.js";
import CommandUtility from "../utility/command-util.js";
import ContentManager from "../content/content-manager.js";
import FileUtility from "../utility/file-util.js";
import LogApi from "../api/log-api.js";
import FileLoggerUtility from "../utility/log-util.js";
import SystemMonitor from "../monitor/system-monitor.js";
import SoftwareConfiguration from "../configuration/software-config.js";

const MAX_SCREENSHOTS = 3;

class ApiLogger {
  static async createScreenshotsFolder() {
    if (!fs.existsSync(folders.SCREENSHOTS_FOLDER)) {
      fs.mkdirSync(folders.SCREENSHOTS_FOLDER);
    }
  }

  static async uploadNewScreenshot(ethMAC, screenshotId) {
    const screenshotInfo = await takeScreenshot();
    return await this.sendScreenshotToAPI(
      ethMAC,
      screenshotId,
      screenshotInfo.path,
      screenshotInfo.timestamp
    );
  }

  static async uploadOldScreenshots(ethMAC) {
    const oldScreenshots = await FileUtility.readFilesFromDirectory(
      folders.SCREENSHOTS_FOLDER
    );
    if (oldScreenshots.length === 0) {
      return;
    }

    const screenshotsData = getScreenshotsData(oldScreenshots);
    for (const screenshotInfo of screenshotsData) {
      await this.sendScreenshotToAPI(
        ethMAC,
        null,
        screenshotInfo.path,
        screenshotInfo.timestamp
      );
    }

    return;
  }

  static async deleteOlderScreenshots(ttlInMinutes) {
    const oldScreenshots = await FileUtility.readFilesFromDirectory(
      folders.SCREENSHOTS_FOLDER
    );
    if (oldScreenshots.length === 0) {
      return;
    }
    const timestampNow = Date.now();
    const screenshotsData = getScreenshotsData(oldScreenshots);
    for (const screenshotInfo of screenshotsData) {
      if ((timestampNow - screenshotInfo.timestamp) / 60000 > ttlInMinutes) {
        await deleteScreenshot(screenshotInfo.path);
      }
    }

    return;
  }

  static async sendScreenshotToAPI(
    ethMAC,
    screenshotId,
    screenshotPath,
    screenshotTimestamp
  ) {
    try {
      const status = await LogApi.uploadScreenshot(
        ethMAC,
        screenshotId,
        screenshotPath,
        screenshotTimestamp
      );

      if (status === api.STATUS.SUCCESS) {
        await this.insertScreenshotLog(ethMAC, "success", screenshotTimestamp);
        await deleteScreenshot(screenshotPath);
      } else {
        await this.insertScreenshotLog(ethMAC, "error", null);
      }
    } catch (err) {
      await this.insertScreenshotLog(ethMAC, "error", null);
    }

    return;
  }

  static async uploadLogFileToAPI(ethMAC) {
    try {
      const status = await LogApi.uploadLogFileToAPI(ethMAC, log.LOG_FILE);

      if (status === api.STATUS.SUCCESS) {
        await FileLoggerUtility.deleteLogFile();
        await FileLoggerUtility.createLogFile();

        await this.insertUploadLogFileLog(ethMAC, "success");
      }
    } catch (err) {
      await this.insertUploadLogFileLog(ethMAC, "error");
    }
  }

  static async getBasicLogInfo() {
    const activePlaylist = await ContentManager.getActivePlaylist();

    return {
      currentPlaylistId:
        activePlaylist.storedPlaylist !== null
          ? activePlaylist.storedPlaylist.playlistId
          : null,
      softwareVersion: await SoftwareConfiguration.getSoftwareVersion(),
    };
  }

  static async insertDeviceStatusLog(ethMAC, networkInfo) {
    const basicLogInfo = await this.getBasicLogInfo();
    const systemStatus = await SystemMonitor.getStatus(500);
    const logInfo = {
      ...systemStatus,
      ...basicLogInfo,
      ...networkInfo,
    };

    const ethIP = `ETH IP address: ${networkInfo.ethIP}`;
    const wifiIP = `WIFI IP address: ${networkInfo.wifiIP}`;
    const wifiSSID = `${
      networkInfo.wifiSSID
        ? "WIFI SSID: " + networkInfo.wifiSSID
        : "Not connected to WiFi"
    }`;
    const softwareVersion = `Software version: ${basicLogInfo.softwareVersion}`;
    const playlist = `Playlist ID: ${basicLogInfo.currentPlaylistId || "none"}`;
    const cpu = `CPU: ${systemStatus.cpu}%`;
    const memory = `RAM: ${systemStatus.ram.percent}%`;
    const disk = `Disk: ${systemStatus.disk.used}GB/${systemStatus.disk.total}GB (${systemStatus.disk.percent}%)`;
    const cpuTemp = `CPUtemp: ${
      systemStatus.cpuTemp ? systemStatus.cpuTemp.toString() : 0
    }°C`;
    const gpuTemp = `GPUtemp: ${
      systemStatus.gpuTemp ? systemStatus.gpuTemp.toString() : 0
    }°C`;

    const logString = `Device ACTIVE!! MAC: ${ethMAC}, ${ethIP}, ${wifiIP}, ${wifiSSID}, ${softwareVersion}, ${playlist}, ${cpu}, ${memory}, ${disk}, ${cpuTemp}, ${gpuTemp}`;
    return await LogApi.insertLog(ethMAC, log.ALIVE, logString, logInfo);
  }

  static async insertDeviceSettingsLog(ethMAC, actionStatus) {
    const basicLogInfo = await this.getBasicLogInfo();
    let logString = "";

    if (actionStatus === "success") {
      logString = "Successfully downloaded and applied new device settings!";
    } else if (actionStatus === "error") {
      logString = "Error on downloading or applying device settings!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.SETTINGS,
      logString,
      basicLogInfo
    );
  }

  static async insertDeviceConfigurationLog(ethMAC, actionStatus) {
    const basicLogInfo = await this.getBasicLogInfo();
    let logString = "";

    if (actionStatus === "success") {
      logString =
        "Successfully downloaded and applied new device configuration!";
    } else if (actionStatus === "error") {
      logString = "Error on downloading or applying device configuration!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.CONFIGURATION,
      logString,
      basicLogInfo
    );
  }

  static async insertConnectionStatusLog(
    ethMAC,
    actionStatus,
    networkInfo,
    ipAddress
  ) {
    const basicLogInfo = await this.getBasicLogInfo();
    const logInfo = {
      ...basicLogInfo,
      networkSetupId: networkInfo.networkSetupId,
    };
    let logString = "";
    let networkType =
      networkInfo.networkType === device.ETH_INTERFACE ? "Ethernet" : "WiFi";

    if (actionStatus === "success") {
      logString = `Successfully connected to ${networkType} network ${
        networkInfo.ssid || ""
      } with IP address: ${ipAddress}!`;
    } else if (actionStatus === "error") {
      logString = `Error on connecting to ${networkType} network ${
        networkInfo.ssid || ""
      }!`;
    }

    return await LogApi.insertLog(ethMAC, log.NETWORK, logString, logInfo);
  }

  static async insertStoreStatusLog(ethMAC, actionStatus, networkInfo) {
    const basicLogInfo = await this.getBasicLogInfo();
    let logString = "";
    let networkType =
      networkInfo.networkType === device.ETH_INTERFACE ? "Ethernet" : "WiFi";

    if (actionStatus === "success") {
      logString = `Successfully stored ${networkType} network ${
        networkInfo.ssid || ""
      }!`;
    } else if (actionStatus === "error") {
      logString = `Error on storing ${networkType} network ${
        networkInfo.ssid || ""
      }`;
    }

    return await LogApi.insertLog(
      ethMAC,
      log.NETWORK,
      logString,
      basicLogInfo
    );
  }

  static async insertGetNetworkSetupLog(ethMAC, actionStatus) {
    const basicLogInfo = await this.getBasicLogInfo();
    let logString = "";

    if (actionStatus === "success") {
      logString = "Successfully downloaded and applied new network setup!";
    } else if (actionStatus === "error") {
      logString = "Error on downloading or applying network setup!";
    }

    return await LogApi.insertLog(ethMAC, log.NETWORK, logString, basicLogInfo);
  }

  static async insertScreenshotLog(ethMAC, actionStatus, timestamp) {
    const basicLogInfo = await this.getBasicLogInfo();
    let logString = "";

    if (actionStatus === "success") {
      logString = `Successfully uploaded new screenshot: screenshot-${timestamp}.jpg!`;
    } else if (actionStatus === "error") {
      logString = "Error uploading screenshot!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.SCREENSHOT,
      logString,
      basicLogInfo
    );
  }

  static async insertGetPlaylistLog(ethMAC, actionStatus, playlist) {
    const basicLogInfo = await this.getBasicLogInfo();
    let logString = "";

    if (actionStatus === "success") {
      logString = `Successfully downloaded playlist JSON! Name: ${playlist.name}, ID: ${playlist.playlistId}, Version: ${playlist.playlistVersion}`;
    } else if (actionStatus === "error") {
      logString = `Error downloading playlist JSON!`;
    }

    return await LogApi.insertLog(
      ethMAC,
      log.PLAYLIST,
      logString,
      basicLogInfo
    );
  }

  static async insertDownloadPlaylistItemLog(
    ethMAC,
    actionStatus,
    item,
    extraString
  ) {
    const basicLogInfo = await this.getBasicLogInfo();
    let logString = "";

    if (actionStatus === "start") {
      logString = `Started downloading playlist item! Name: ${item.name}, ID: ${item.id}, Type: ${item.type}`;
    } else if (actionStatus === "success") {
      logString = `Successfully downloaded playlist item! Name: ${item.name}, ID: ${item.id}, Type: ${item.type}`;
    } else if (actionStatus === "error") {
      logString = `Error downloading playlist item! Name: ${item.name}, ID: ${item.id}, Type: ${item.type}`;
    }
    if (extraString) {
      logString = logString + ". " + extraString;
    }

    if (actionStatus === "error") {
      return await LogApi.insertLog(ethMAC, log.ERROR, logString, basicLogInfo);
    } else {
      return await LogApi.insertLog(
        ethMAC,
        log.PLAYLIST,
        logString,
        basicLogInfo
      );
    }
  }

  static async insertDownloadAllItemsLog(ethMAC, actionStatus) {
    const basicLogInfo = await this.getBasicLogInfo();
    let logString = "";

    if (actionStatus === "success") {
      logString =
        "Successfully downloaded playlist items. Playlist is starting soon!";
    } else if (actionStatus === "error") {
      logString = "Error downloading playlist items. Cannot start playlist!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.PLAYLIST,
      logString,
      basicLogInfo
    );
  }

  static async insertGetTemporaryContentLog(ethMAC, actionStatus) {
    const basicLogInfo = await this.getBasicLogInfo();
    let logString = "";

    if (actionStatus === "success") {
      logString = "Successfully downloaded temporary content JSON!";
    } else if (actionStatus === "error") {
      logString = "Error downloading temporary content JSON!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.TEMPORARY_CONTENT,
      logString,
      basicLogInfo
    );
  }

  static async insertDownloadTemporaryContentItemLog(
    ethMAC,
    actionStatus,
    item
  ) {
    const basicLogInfo = await this.getBasicLogInfo();
    let logString = "";

    if (actionStatus === "start") {
      logString = `Started downloading temporary content item! ID: ${item.id}, Type: ${item.type}`;
    } else if (actionStatus === "success") {
      logString = `Successfully downloaded temporary content item! ID: ${item.id}, Type: ${item.type}`;
    } else if (actionStatus === "error") {
      logString = `Error downloading temporary content item! ID: ${item.id}, Type: ${item.type}`;
    }

    return await LogApi.insertLog(
      ethMAC,
      log.TEMPORARY_CONTENT,
      logString,
      basicLogInfo
    );
  }

  static async insertDownloadAllTemporaryContentLog(ethMAC, actionStatus) {
    const basicLogInfo = await this.getBasicLogInfo();
    let logString = "";

    if (actionStatus === "success") {
      logString =
        "Successfully downloaded temporary content items. Playing soon!";
    } else if (actionStatus === "error") {
      logString =
        "Error downloading temporary content items. Cannot start playing!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.TEMPORARY_CONTENT,
      logString,
      basicLogInfo
    );
  }

  static async insertSystemLog(ethMAC, logString) {
    const basicLogInfo = await this.getBasicLogInfo();
    const systemStatus = await SystemMonitor.getStatus(500);
    const logInfo = {
      ...systemStatus,
      ...basicLogInfo,
    };

    return await LogApi.insertLog(ethMAC, log.SYSTEM, logString, logInfo);
  }

  static async insertGetDeviceActionLog(ethMAC, actionStatus, receivedAction) {
    const basicLogInfo = await this.getBasicLogInfo();
    let logString = "";

    if (actionStatus === "success") {
      logString = `Successfully received device action: ${receivedAction}!`;
    } else if (actionStatus === "error") {
      logString = "Error on receiving device action!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.DEVICE_ACTION,
      logString,
      basicLogInfo
    );
  }

  static async insertGetNewSoftwareVersionLog(ethMAC, actionStatus) {
    let logString = "";

    if (actionStatus === "success") {
      logString = "Successfully downloaded software version info!";
    } else if (actionStatus === "error") {
      logString = "Error downloading software version info!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.SOFTWARE_VERSION,
      logString,
      null
    );
  }

  static async insertSoftwareVersionSizeLog(ethMAC, actionStatus) {
    let logString = "";

    if (actionStatus === "success") {
      logString = "Software version file size check OK! Starting download";
    } else if (actionStatus === "error") {
      logString = "Software version file size too big! Cannot start download!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.SOFTWARE_VERSION,
      logString,
      null
    );
  }

  static async insertSoftwareVersionDownloadLog(ethMAC, actionStatus) {
    let logString = "";

    if (actionStatus === "success") {
      logString = "Software version downloaded successfully!";
    } else if (actionStatus === "error") {
      logString = "Error downloading software version!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.SOFTWARE_VERSION,
      logString,
      null
    );
  }

  static async insertSoftwareVersionChecksumLog(ethMAC, actionStatus) {
    let logString = "";

    if (actionStatus === "success") {
      logString =
        "Software version integrity checked successfully! Starting installation";
    } else if (actionStatus === "error") {
      logString =
        "Error on checking software version integrity! Cannot start installation!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.SOFTWARE_VERSION,
      logString,
      null
    );
  }

  static async insertSoftwareVersionPackagesLog(
    ethMAC,
    actionStatus,
    packageType
  ) {
    let logString = "";

    if (actionStatus === "success" && packageType === "main") {
      logString = "Software version main npm packages installed successfully!";
    }

    if (actionStatus === "success" && packageType === "startup") {
      logString =
        "Software version startup client npm packages installed successfully!";
    }

    if (actionStatus === "error" && packageType === "main") {
      logString = "Error on installing main npm packages for software version!";
    }

    if (actionStatus === "error" && packageType === "startup") {
      logString =
        "Error on installing startup npm packages for software version!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.SOFTWARE_VERSION,
      logString,
      null
    );
  }

  static async insertSoftwareVersionBuildLog(ethMAC, actionStatus) {
    let logString = "";

    if (actionStatus === "success") {
      logString = "Software version startup client built successfully!";
    } else if (actionStatus === "error") {
      logString = "Error on building software version startup client!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.SOFTWARE_VERSION,
      logString,
      null
    );
  }

  static async insertSoftwareVersionInstallLog(ethMAC, actionStatus) {
    let logString = "";

    if (actionStatus === "success") {
      logString = "Software version installed successfully!";
    } else if (actionStatus === "error ") {
      logString = "Error on software version installation!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.SOFTWARE_VERSION,
      logString,
      null
    );
  }

  static async insertUploadLogFileLog(ethMAC, actionStatus) {
    const basicLogInfo = await this.getBasicLogInfo();
    let logString = "";

    if (actionStatus === "success") {
      logString = "Successfully uploaded log file!";
    } else if (actionStatus === "error") {
      logString = "Error on uploading log file!";
    }

    return await LogApi.insertLog(
      ethMAC,
      log.LOG_FILE,
      logString,
      basicLogInfo
    );
  }

  static async insertTimedActionLog(ethMAC, logString) {
    return await LogApi.insertLog(ethMAC, log.DEVICE_ACTION, logString, null);
  }
}

async function takeScreenshot() {
  const screenshotTimestamp = Date.now();
  const screenshotPath = `${folders.SCREENSHOTS_FOLDER}/screenshot-${screenshotTimestamp}.png`;
  const screenshotPathJPG = `${folders.SCREENSHOTS_FOLDER}/screenshot-${screenshotTimestamp}.jpg`;

  const currentScreenshots = await FileUtility.readFilesFromDirectory(
    folders.SCREENSHOTS_FOLDER
  );
  if (isScreenshotsLimitReached(currentScreenshots)) {
    await deleteOldestScreenshot(currentScreenshots);
  }

  await CommandUtility.execCommand(`scrot --silent ${screenshotPath}`);

  await CommandUtility.execCommand(
    `convert -resize 1280x720 ${screenshotPath} ${screenshotPathJPG}`
  );
  await deleteScreenshot(screenshotPath);

  return {
    timestamp: screenshotTimestamp,
    path: screenshotPathJPG,
  };
}

function isScreenshotsLimitReached(screenshots) {
  return screenshots.length >= MAX_SCREENSHOTS ? true : false;
}

async function deleteOldestScreenshot(screenshots) {
  const screenshotsData = getScreenshotsData(screenshots);

  const oldestTimestamp = Math.min(
    ...screenshotsData.map((screenshot) => screenshot.timestamp)
  );
  const oldestScreenshot = screenshots.find((screenshot) =>
    screenshot.includes(oldestTimestamp.toString())
  );

  return await deleteScreenshot(oldestScreenshot);
}

function getScreenshotsData(screenshots) {
  return screenshots.map((screenshot) => {
    const screenshotParts = screenshot.split("-");
    const timestampParts = screenshotParts[1].split(".");

    return {
      timestamp: parseInt(timestampParts[0]),
      path: screenshot,
    };
  });
}

async function deleteScreenshot(screenshotPath) {
  return await CommandUtility.execCommand(`rm ${screenshotPath}`);
}

export default ApiLogger;
