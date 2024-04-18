import fs from "fs";
import Startup from "./startup/startup.js";
import CommandUtility from "./utility/command-util.js";
import ContentManager from "./content/content-manager.js";
import FileLoggerUtility from "./utility/log-util.js";
import NetworkConfiguration from "./configuration/network-config.js";
import SoftwareConfiguration from "./configuration/software-config.js";
import DeviceActionsHelper from "./actions/device-actions-helper.js";
import { deviceModes } from "./utility/constants.js";

let settings,
  deviceData,
  shortConfigData = {};

async function initialize() {
  await startPlayerScript();

  setTimeout(
    async (networkData) => {
      if (!Startup.setupMode) {
        await Startup.removeStartupClient();
        await Startup.closeStartupServer();
        await playContentOnStart();
        await startApiHandlers(networkData);
      }
    },
    30000,
    Startup.returnBasicNetworkData()
  );
}

async function startPlayerScript() {
  await ContentManager.createContentFolder();
  await Startup.createPlayerFilesFolder();
  await Startup.createScreenshotsFolder();
  await Startup.createNetworkingFile();
  await Startup.createDeviceSettingsFile();
  await ContentManager.createInitialActivePlaylist();
  await FileLoggerUtility.createLogFile();
  await NetworkConfiguration.initialCheckUpOfInternetConnections();

  await CommandUtility.pauseExecution(5000);

  await Startup.initializeStartupServer();
  await Startup.getStartupData();
  Startup.displayStartupClient();
  await Startup.logStartupData();

  settings = await SoftwareConfiguration.readSettingsFile();
  deviceData = await SoftwareConfiguration.readDeviceDataFile();
  shortConfigData = await SoftwareConfiguration.readDeviceConfigShortFile();

  if (deviceData.deviceMode === deviceModes.SCREENS) {
    await CommandUtility.execCommand("pacmd set-source-volume 0 0");
  } else {
    await CommandUtility.execCommand(
      `pacmd set-source-volume 0 ${
        shortConfigData.systemVolume
          ? Math.round(shortConfigData.systemVolume * 655, 36)
          : 65536
      }`
    );
  }
}

async function playContentOnStart() {
  await CommandUtility.execCommand(`xdotool mousemove 10000 10000`);
  await ContentManager.startContentPlayer();
}

async function startApiHandlers(networkData) {
  await NetworkConfiguration.syncNetworksWithServer(networkData.ethMAC);
  await startTimedActions(networkData);
}

async function startTimedActions(networkData) {
  await getRestartAction(networkData.ethMAC);
}

async function getRestartAction(ethMAC) {
  const action = await DeviceActionsHelper.getRestartAction(ethMAC);

  if (action) {
    await DeviceActionsHelper.performDeviceAction(networkData, action);
  }

  setTimeout(
    (ethMAC) => getRestartAction(ethMAC),
    settings.apiFrequency * 1000,
    ethMAC
  );
}

initialize();
