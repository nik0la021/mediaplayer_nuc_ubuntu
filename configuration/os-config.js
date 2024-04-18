import CommandUtility from "../utility/command-util.js";
import FileUtility from "../utility/file-util.js";
import { files, folders } from "../utility/constants.js";
import ConfigurationApi from "../api/config-api.js";
import ApiLogger from "../logger/api-logger.js";

const OS_VERSION_INDEX = 1;

class OSConfiguration {
  static async getOSVersion() {
    const commandOutput = await CommandUtility.execCommand(
      "cat /etc/os-release | grep PRETTY_NAME"
    );
    const outputParts = commandOutput.trim().split("=");
    const osVersion = outputParts[OS_VERSION_INDEX];

    const kernelCommand = await CommandUtility.execCommand(
      "uname --kernel-release"
    );
    const kernelVersion = kernelCommand.trim().replace("\n", "");

    const returnVersionString = `${osVersion}, ${kernelVersion}`;
    return returnVersionString;
  }

  static async getDeviceModel() {
    let deviceModel;
    try {
      deviceModel = await CommandUtility.execCommand(
        "cat /proc/cpuinfo | grep 'model name'"
      );
      deviceModel = deviceModel.split("\n")[0].split(":")[1];
    } catch (e) {
      deviceModel = "Couldn't get model";
    }
    return { deviceModel: deviceModel };
  }

  static async getRamSize() {
    return await CommandUtility.execCommand(
      "echo $(($(getconf _PHYS_PAGES) * $(getconf PAGE_SIZE) / (1024 * 1024)))"
    );
  }

  static async getAllOSData() {
    let modelData = await this.getDeviceModel();
    return {
      version: await this.getOSVersion(),
      model: modelData.deviceModel + " (" + (await this.getRamSize()) + " MB)",
    };
  }

  static async rebootDevice() {
    await CommandUtility.execCommand("reboot");
  }

  static async getDeviceConfiguration(ethMAC) {
    let result = await ConfigurationApi.getDeviceConfiguration(ethMAC);
    let configuration = parseDeviceConfigurationResult(result);
    return configuration;
  }

  static async applyDeviceConfiguration(ethMAC, configuration) {
    if (configuration === null) {
      return await ApiLogger.insertDeviceConfigurationLog(ethMAC, "error");
    }

    try {
      if (configuration.configurationFilePath !== null) {
        const configFileDestination = `${folders.PLAYER_FILES_FOLDER}/new_config.txt"`;

        await backupCurrentConfigFile();
        await ConfigurationApi.downloadConfigurationFile(
          configuration.configurationFilePath,
          configFileDestination
        );
        await replaceCurrentConfigFile(configFileDestination);
      } else {
        await applyIndividualProperties(configuration);
      }

      await this.uploadConfigurationFile(ethMAC);
      await ApiLogger.insertDeviceConfigurationLog(ethMAC, "success");
      await ApiLogger.insertSystemLog(ethMAC, "Device REBOOTING!");
      await this.rebootDevice();
    } catch (err) {
      await ApiLogger.insertDeviceConfigurationLog(ethMAC, "error");
    }

    return;
  }

  static async uploadConfigurationFile(ethMAC) {
    await ConfigurationApi.uploadConfigurationFile(ethMAC, files.CONFIG_FILE);
  }
}

function parseDeviceConfigurationResult(result) {
  if (result === null) {
    return null;
  }

  let deviceResolution =
    result.deviceResolution !== undefined
      ? result.deviceResolution.jsonOptions
      : null;
  if (deviceResolution) {
    try {
      deviceResolution = JSON.parse(deviceResolution);
    } catch (err) {
      deviceResolution = null;
    }
  }

  return {
    id: result.id || null,
    configurationFilePath: result.configurationFilePath || null,
    overscanTop: result.overscanTop !== undefined ? result.overscanTop : 0,
    overscanBottom:
      result.overscanBottom !== undefined ? result.overscanBottom : 0,
    overscanLeft: result.overscanLeft !== undefined ? result.overscanLeft : 0,
    overscanRight:
      result.overscanRight !== undefined ? result.overscanRight : 0,
    rotateByDeg: result.rotateByDeg !== undefined ? result.rotateByDeg : 0,
    systemVolume: result.systemVolume !== undefined ? result.systemVolume : 50,
    deviceResolution: deviceResolution,
  };
}

async function applyIndividualProperties(configuration) {
  if (await propertyExistsInConfigFile("overscan_top")) {
    await updatePropertyValue("overscan_top", configuration.overscanTop);
  } else {
    await appendPropertyValue("overscan_top", configuration.overscanTop);
  }

  if (await propertyExistsInConfigFile("overscan_bottom")) {
    await updatePropertyValue("overscan_bottom", configuration.overscanBottom);
  } else {
    await appendPropertyValue("overscan_bottom", configuration.overscanBottom);
  }

  if (await propertyExistsInConfigFile("overscan_left")) {
    await updatePropertyValue("overscan_left", configuration.overscanLeft);
  } else {
    await appendPropertyValue("overscan_left", configuration.overscanLeft);
  }

  if (await propertyExistsInConfigFile("overscan_right")) {
    await updatePropertyValue("overscan_right", configuration.overscanRight);
  } else {
    await appendPropertyValue("overscan_right", configuration.overscanRight);
  }

  if (await propertyExistsInConfigFile("display_hdmi_rotate")) {
    await updatePropertyValue("display_hdmi_rotate", configuration.rotateByDeg);
  } else {
    await appendPropertyValue("display_hdmi_rotate", configuration.rotateByDeg);
  }

  if (
    configuration.deviceResolution &&
    configuration.deviceResolution["hdmiGroup"]
  ) {
    if (await propertyExistsInConfigFile("hdmi_group")) {
      await updatePropertyValue(
        "hdmi_group",
        configuration.deviceResolution["hdmiGroup"]
      );
    } else {
      await appendPropertyValue(
        "hdmi_group",
        configuration.deviceResolution["hdmiGroup"]
      );
    }
  }

  if (
    configuration.deviceResolution &&
    configuration.deviceResolution["hdmiMode"]
  ) {
    if (await propertyExistsInConfigFile("hdmi_mode")) {
      await updatePropertyValue(
        "hdmi_mode",
        configuration.deviceResolution["hdmiMode"]
      );
    } else {
      await appendPropertyValue(
        "hdmi_mode",
        configuration.deviceResolution["hdmiMode"]
      );
    }
  }

  await CommandUtility.execCommand(`amixer -M sset PCM ${configuration.systemVolume}%`);

  return;
}

async function backupCurrentConfigFile() {
  const currentTimestamp = Date.now();
  return await CommandUtility.execCommand(
    `cp ${files.CONFIG_FILE} /home/pi/PlayerFiles/${currentTimestamp}_config.txt`
  );
}

async function replaceCurrentConfigFile(newConfigPath) {
  return await CommandUtility.execCommand(`mv ${newConfigPath} ${files.CONFIG_FILE}`);
}

async function propertyExistsInConfigFile(property) {
  const commandOutput = await execCommand(
    `cat ${files.CONFIG_FILE} | grep -v "#${property}" | grep "${property}"`
  );
  return commandOutput !== undefined ? true : false;
}

async function updatePropertyValue(property, value) {
  return await execCommand(
    `sed -i 's/^${property}=[0-9]*/${property}=${value}/g' ${files.CONFIG_FILE}`
  );
}

async function appendPropertyValue(property, value) {
  return await FileUtility.appendToFile(files.CONFIG_FILE, `${property}=${value}\n`);
}

export default OSConfiguration;
