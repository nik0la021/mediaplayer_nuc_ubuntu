import fs from "fs";
import { createServer } from "http";
import { folders, files, application, port, device } from "../utility/constants.js";
import ProcessManager from "../process/process-manager.js";
import NetworkConfiguration from "../configuration/network-config.js";
import ApiLogger from "../logger/api-logger.js";
import SoftwareConfiguration from "../configuration/software-config.js";
import ApiUtility from "../utility/api-util.js";
import ContentManager from "../content/content-manager.js";
import OSConfiguration from "../configuration/os-config.js";

let startupClient, startupServer, networkData, softwareData, osData = {};

class Startup {
  static async initializeStartupServer() {
    startupServer = createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );

      if (req.method === "POST") {
        ApiUtility.collectRequestData(req, async (result) => {
          if (result.type === "setup") {
            this.setupMode = true;
            res.end(JSON.stringify({ status: "In setup mode" }));
          } else if (result.type === "initialData") {
            handleInitialDataRequest(networkData, softwareData, osData, res);
          } else if (result.type === "updatedData") {
            await this.getStartupData();
            handleInitialDataRequest(networkData, softwareData, osData, res);
          } else if (result.type === "wifiDataConnect") {
            handleWifiDataConnectRequest(result, res);
          } else if (result.type === "wifiDataStore") {
            handleWifiDataStoreRequest(result, networkData.ethMAC, res);
          } else if (result.type === "ethDataConnect") {
            handleEthDataConnectRequest(result, networkConfig, res);
          } else if (result.type === "ethDataStore") {
            handleEthDataStoreRequest(result, networkData.ethMAC, res);
          } else if (result.type === "wifiNetworkCheck") {
            handleWifiNetworkCheckRequest(result, networkData.ethMAC, res);
          } else if (result.type === "ethNetworkCheck") {
            handleEthNetworkCheckRequest(result, networkData.ethMAC, res);
          } else if (result.type === "changeLocale") {
            handleChangeLocaleRequest(result, res);
          } else if (result.type === "deleteConnection") {
            handleDeleteConnectionRequest(result, networkData.ethMAC, res);
          } else if (result.type === "restart") {
            res.end(JSON.stringify({ status: "Rebooting" }));
            await ApiLogger.insertSystemLog(
              networkData.ethMAC,
              "Device REBOOTING!"
            );
            OSConfiguration.rebootDevice();
          } else if (result.type === "deleteContent") {
            handleDeleteAllContentAction(res);
          }
        });
      }
    }).listen(port.STARTUP_SERVER_PORT);
  }

  static async closeStartupServer() {
    this.close(async () => {
      await fileLoggerUtility.logToFile(
        `Startup server on port ${port.STARTUP_SERVER_PORT} closed`
      );
    });
  }

  async checkForRestartLog() {
    if (fs.existsSync(RESTART_LOG_FILE)) {
      fs.unlinkSync(RESTART_LOG_FILE);
      await this.logger.insertSystemLog(
        this.networkData.ethMAC,
        "Device performed daily scheduled restart!"
      );
    }
  }

  static async getStartupData() {
    networkData = await NetworkConfiguration.getAllNetworkData();
    softwareData = await SoftwareConfiguration.getAllSoftwareData(
      networkData.ethMAC,
      this.returnBasicNetworkData()
    );
    osData = await OSConfiguration.getAllOSData();
    return osData.isRPI;
  }

  static returnBasicNetworkData() {
    return {
      ethMAC: networkData.ethMAC,
      wifiMAC: networkData.wifiMAC,
      ethIP: networkData.ethIP,
      wifiIP: networkData.wifiIP,
      wifiSSID: networkData.wifiSSID,
    };
  }

  static async displayStartupClient() {
    startupClient = await ProcessManager.createProcess(
      application.LIVEFEED_PLAYER.name,
      [
        ...application.LIVEFEED_PLAYER.flags,
        "--kiosk",
        files.STARTUP_CLIENT_FILE,
      ]
    );
  }

  static async removeStartupClient() {
    await ProcessManager.killProcess(startupClient.pid);
  }

  static async logStartupData() {
    const ethIP = `ETH IP Address: ${networkData.ethIP}`;
    const wifiIP = `WiFi IP Address: ${networkData.wifiIP}`;
    const ethMAC = `ETH MAC Address: ${networkData.ethMAC}`;
    const wifiSSID = `WiFi network: ${networkData.wifiSSID}`;
    const deviceName = `Device name: ${softwareData.registration.name}`;
    const appVersion = `App version: ${osData.version} - ${softwareData.version}`;
    const deviceModel = `Device model: ${osData.model}`;

    const logString = `Device STARTED! ${ethIP}, ${wifiIP}, ${ethMAC}, ${wifiSSID}, ${deviceName}, ${appVersion}, ${deviceModel}`;

    return await ApiLogger.insertSystemLog(
      networkData.ethMAC,
      logString
    );
  }

  static async createPlayerFilesFolder() {
    if (!fs.existsSync(folders.PLAYER_FILES_FOLDER)) {
      fs.mkdirSync(folders.PLAYER_FILES_FOLDER);
    }
  }

  static async createScreenshotsFolder() {
    await ApiLogger.createScreenshotsFolder();
  }

  static async createNetworkingFile() {
    await NetworkConfiguration.createConnectionsFile();
  }

  static async createDeviceSettingsFile() {
    await SoftwareConfiguration.createSettingsFile();
  }
}

function handleInitialDataRequest(networkData, softwareData, osData, response) {
  const data = {
    network: { ...networkData },
    software: { ...softwareData },
    os: { ...osData },
  };

  response.end(JSON.stringify(data));
}

async function handleWifiDataConnectRequest(data, response) {
  await NetworkConfiguration.blankSupplicantFile();

  const connectionId = await NetworkConfiguration.setNewWifiConnection(data);
  await NetworkConfiguration.reconfigureWlan();
  await NetworkConfiguration.restartNetworkingService();

  response.end(JSON.stringify({ netService: "OK", connId: connectionId }));
}

async function handleWifiDataStoreRequest(data, ethMAC, response) {
  data.id = await NetworkConfiguration.setNewWifiConnection(data);
  await NetworkConfiguration.reconfigureWlan();
  await NetworkConfiguration.restartNetworkingService();

  setTimeout(() => {
    NetworkConfiguration.setNetworkSetup(ethMAC, data);
    response.end(
      JSON.stringify({ status: "Success", message: "Connection stored" })
    );
  }, 8000);
}

async function handleEthDataConnectRequest(data, response) {
  const connectionId = await NetworkConfiguration.setNewEthConnection(data);
  await NetworkConfiguration.restartNetworkingService();

  response.end(JSON.stringify({ netService: "OK", connId: connectionId }));
}

async function handleEthDataStoreRequest(data, ethMAC, response) {
  data.id = await NetworkConfiguration.setNewEthConnection(data);
  await NetworkConfiguration.restartNetworkingService();

  setTimeout(() => {
    NetworkConfiguration.setNetworkSetup(ethMAC, data);
    response.end(
      JSON.stringify({ status: "Success", message: "Connection stored" })
    );
  }, 8000);
}

async function handleWifiNetworkCheckRequest(data, ethMAC, response) {
  setTimeout(async () => {
    const ipAddress = await NetworkConfiguration.getIpAddress(
      device.WIFI_INTERFACE
    );
    const pingStatus = await NetworkConfiguration.networkCheck(
      device.WIFI_INTERFACE
    );

    if (
      pingStatus.googleStatus === "Ping fail" ||
      pingStatus.screensStatus === "Ping fail"
    ) {
      await NetworkConfiguration.resetFaultyWifiConnection(data);
    } else {
      await NetworkConfiguration.restoreValidConnectionsToSupplicantFile();
      NetworkConfiguration.setNetworkSetup(ethMAC, data);
    }

    response.end(
      JSON.stringify({
        ipAddress: ipAddress,
        ping: pingStatus,
      })
    );
  }, 10000);
}

async function handleEthNetworkCheckRequest(data, ethMAC, response) {
  setTimeout(async () => {
    const ipAddress = await NetworkConfiguration.getIpAddress(
      device.ETH_INTERFACE
    );
    const pingStatus = await NetworkConfiguration.networkCheck(
      device.ETH_INTERFACE
    );

    if (
      pingStatus.googleStatus === "Ping fail" ||
      pingStatus.screensStatus === "Ping fail"
    ) {
      await NetworkConfiguration.resetFaultyEthConnection(data);
    } else {
      NetworkConfiguration.setNetworkSetup(ethMAC, data);
    }

    response.end(
      JSON.stringify({
        ipAddress: ipAddress,
        ping: pingStatus,
      })
    );
  }, 10000);
}

async function handleChangeLocaleRequest(data, response) {
  await NetworkConfiguration.changeCountryCode(data.locale);
  await NetworkConfiguration.restartNetworkingService();

  response.end(
    JSON.stringify({
      status: "Success",
      message: `Country code changed to ${data.locale}`,
    })
  );
}

async function handleDeleteConnectionRequest(data, ethMAC, response) {
  if (data.connectionType === "wifi") {
    try {
      await NetworkConfiguration.deleteNetworkSetup(ethMAC, data);
      await NetworkConfiguration.turnOffInterface(device.WIFI_INTERFACE);
      await NetworkConfiguration.removeInvalidWifiConnectionFromFile(data.id);
      await NetworkConfiguration.restoreValidConnectionsToSupplicantFile();
      if (data.hasStaticData === "true")
        await NetworkConfiguration.removeInvalidWifiEntryFromDhcpcdFile(
          data.networkId
        );

      await NetworkConfiguration.turnOnInterface(device.WIFI_INTERFACE);
      await NetworkConfiguration.reconfigureWlan();
      await NetworkConfiguration.restartNetworkingService();

      setTimeout(() => {
        response.end(
          JSON.stringify({ status: "Success", message: "Connection deleted" })
        );
      }, 8000);
    } catch (err) {
      response.end(
        JSON.stringify({ status: "Error", message: "Connection not deleted" })
      );
    }
  } else if (data.connectionType === "eth") {
    try {
      await NetworkConfiguration.deleteNetworkSetup(ethMAC, data);
      await NetworkConfiguration.turnOffInterface(device.ETH_INTERFACE);
      const isUsed = await NetworkConfiguration.isEthConnectionCurrentlyUsed(
        data.id
      );
      await NetworkConfiguration.removeInvalidEthConnectionFromFile(data.id);
      if (isUsed)
        await NetworkConfiguration.removeInvalidEthEntryFromDhcpcdFile();

      await NetworkConfiguration.turnOnInterface(device.ETH_INTERFACE);
      await NetworkConfiguration.restartNetworkingService();

      setTimeout(() => {
        response.end(
          JSON.stringify({ status: "Success", message: "Connection deleted" })
        );
      }, 8000);
    } catch (err) {
      response.end(
        JSON.stringify({ status: "Error", message: "Connection not deleted" })
      );
    }
  }
}

async function handleDeleteAllContentAction(response) {
  const activePlaylistInfo = await ContentManager.getActivePlaylist();

  await ContentManager.deletePlaylistFolderAndContent(
    activePlaylistInfo.pathToFolder
  );
  await ContentManager.deleteTemporaryContentFolderAndFiles();
  await ContentManager.deleteActivePlaylistFile();

  await ContentManager.createInitialActivePlaylist();

  response.end(
    JSON.stringify({ status: "Success", message: "Content deleted" })
  );
}

export default Startup;
