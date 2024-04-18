import fs from "fs";
import FileUtility from "../utility/file-util.js";
import CommandUtility from "../utility/command-util.js";
import NetworkApi from "../api/network-api.js";
import ApiLogger from "../logger/api-logger.js";
import { files, device } from "../utility/constants.js";

const IP_ADDR_INDEX = 1;
const MAC_ADDR_INDEX = 1;

class NetworkConfiguration {
  static async getIpAddress(netInterface) {
    const commandOutput = await CommandUtility.execCommand(
      `ifconfig ${netInterface} | grep inet`
    );

    if (commandOutput === undefined) {
      return "Not connected";
    } else {
      const outputParts = commandOutput.trim().split("\n");
      const ipv4Address = outputParts[0].split(" ");
      return ipv4Address[IP_ADDR_INDEX];
    }
  }

  static async getMACAddress(netInterface) {
    const commandOutput = await CommandUtility.execCommand(
      `ifconfig ${netInterface} | grep ether`
    );
    const outputParts = commandOutput.trim().split(" ");
    return outputParts[MAC_ADDR_INDEX];
  }

  static async getWifiSSID() {
    const commandOutput = await CommandUtility.execCommand(
      `iw ${device.WIFI_INTERFACE} link | grep SSID`
    );

    if (commandOutput === undefined) {
      return "Not connected";
    } else {
      const outputParts = commandOutput.trim().split(" ");
      outputParts.shift();
      return outputParts.join(" ");
    }
  }

  static async getWifiNetworksInRange() {
    let commandOutput = "";
    let networks = [];

    try {
      commandOutput = await CommandUtility.execCommand(
        `iwlist ${device.WIFI_INTERFACE} scan`
      );
      console.log(commandOutput);
      networks = parseScanOutput(commandOutput);
    } catch (err) {
      await this.turnOffInterface(device.WIFI_INTERFACE);
      await this.turnOnInterface(device.WIFI_INTERFACE);
      await this.reconfigureWlan();
      await this.restartNetworkingService();

      setTimeout(async () => {
        commandOutput = await CommandUtility.execCommand(
          `iwlist ${device.WIFI_INTERFACE} scan`
        );
        networks = parseScanOutput(commandOutput);
      }, 5000);
    }

    return networks;
  }

  static async getAllNetworkData() {
    return {
      ethMAC: await this.getMACAddress(device.ETH_INTERFACE),
      wifiMAC: await this.getMACAddress(device.WIFI_INTERFACE),
      wifiSSID: await this.getWifiSSID(),
      wifiNetworks: await this.getWifiNetworksInRange(),
      storedConnections: await readConnectionSettingsFromFile(
        files.CONNECTIONS_FILE
      ),
      ethIP: await this.getIpAddress(device.ETH_INTERFACE),
      wifiIP: await this.getIpAddress(device.WIFI_INTERFACE),
    };
  }

  static async readConnectionsFromFile() {
    return await readConnectionSettingsFromFile(files.CONNECTIONS_FILE);
  }

  static async getNetworkSetup(ethMAC) {
    let result = await NetworkApi.getNetworkSetup(ethMAC);
    let setup = parseNetworkSetupResult(result);
    return setup;
  }

  static async applyNetworkSetup(ethMAC, setup) {
    if (setup === null) {
      return await ApiLogger.insertGetNetworkSetupLog(ethMAC, "error");
    }

    try {
      if (setup.type === "wifiDataConnect") {
        await this.connectWithWifiSettings(ethMAC, setup);
      } else if (setup.type === "wifiDataStore") {
        await this.storeWifiSettings(ethMAC, setup);
      } else if (setup.type === "ethDataConnect") {
        await this.connectWithEthSettings(ethMAC, setup);
      } else if (setup.type === "ethDataStore") {
        await this.storeEthSettings(ethMAC, setup);
      }

      await ApiLogger.insertGetNetworkSetupLog(ethMAC, "success");
    } catch (err) {
      await ApiLogger.insertGetNetworkSetupLog(ethMAC, "error");
    }

    return;
  }

  static async connectWithWifiSettings(ethMAC, setup) {
    await this.backupFiles();
    try {
      await this.blankSupplicantFile();
      setup.id = await this.setNewWifiConnection(setup);
      if (setup.countryLocale !== null)
        await this.changeCountryCode(setup.countryLocale);

      let reconfigureOutput = await this.reconfigureWlan();
      await this.restartNetworkingService();

      if (reconfigureOutput === "FAIL") {
        throw new Exception("Failed to reconfigure wpa_supplicant");
      }
      await CommandUtility.pauseExecution(15000);

      const ipAddress = await this.getIpAddress(device.WIFI_INTERFACE);
      const pingStatus = await this.networkCheck(device.WIFI_INTERFACE);

      if (
        pingStatus.googleStatus === "Ping fail" ||
        pingStatus.screensStatus === "Ping fail"
      ) {
        await this.resetFaultyWifiConnection(setup);
        await CommandUtility.pauseExecution(10000);

        await this.logger.insertConnectionStatusLog(
          ethMAC,
          "error",
          setup,
          ipAddress
        );
      } else {
        await this.restoreValidConnectionsToSupplicantFile();
        await this.logger.insertConnectionStatusLog(
          ethMAC,
          "success",
          setup,
          ipAddress
        );
      }
    } catch (err) {
      await this.restoreBackups();
    }

    return;
  }

  static async connectWithEthSettings(ethMAC, setup) {
    setup.id = await this.setNewEthConnection(setup);
    await this.restartNetworkingService();

    await CommandUtility.pauseExecution(10000);

    const ipAddress = await this.getIpAddress(device.ETH_INTERFACE);
    const pingStatus = await this.networkCheck(device.ETH_INTERFACE);

    if (
      pingStatus.googleStatus === "Ping fail" ||
      pingStatus.screensStatus === "Ping fail"
    ) {
      await this.resetFaultyEthConnection(setup);
      await CommandUtility.pauseExecution(10000);

      await ApiLogger.insertConnectionStatusLog(
        ethMAC,
        "error",
        setup,
        ipAddress
      );
    } else {
      await ApiLogger.insertConnectionStatusLog(
        ethMAC,
        "success",
        setup,
        ipAddress
      );
    }

    return;
  }

  static async storeWifiSettings(ethMAC, setup) {
    await this.setNewWifiConnection(setup);
    await this.reconfigureWlan();
    await this.restartNetworkingService();

    await CommandUtility.pauseExecution(10000);

    return await ApiLogger.insertStoreStatusLog(ethMAC, "success", setup);
  }

  static async storeEthSettings(ethMAC, setup) {
    await this.setNewEthConnection(setup);
    await this.restartNetworkingService();

    await CommandUtility.pauseExecution(10000);

    return await ApiLogger.insertStoreStatusLog(ethMAC, "success", setup);
  }

  static async setNetworkSetup(ethMAC, data) {
    const connectionType = data.type.includes("eth") ? "eth" : "wifi";
    const storedConnection = await this.getConnectionFromFile(
      connectionType,
      data.id
    );
    storedConnection.type = data.type;

    const setup = prepareNetworkDataForAPI(storedConnection);
    const response = await NetworkApi.setNetworkSetup(ethMAC, setup);
    const networkSetupId = response !== null ? response.networkSetupId : null;

    return await this.setNetworkSetupIdToConnection(
      connectionType,
      data.id,
      networkSetupId
    );
  }

  static async deleteNetworkSetup(ethMAC, data) {
    const storedConnection = await this.getConnectionFromFile(
      data.connectionType,
      data.id
    );

    if (storedConnection.networkSetupId !== null) {
      await NetworkApi.deleteNetworkSetup(
        ethMAC,
        storedConnection.networkSetupId
      );
    }

    return;
  }

  static async afterDeleteAllNetworks(ethMAC, listOfIdsToLeave) {
    return await NetworkApi.afterDeleteAllNetworks(
      ethMAC,
      JSON.stringify(listOfIdsToLeave)
    );
  }

  static async createConnectionsFile() {
    const connections = {
      wifi: [],
      eth: [],
    };

    if (!fs.existsSync(files.CONNECTIONS_FILE)) {
      await fs.writeToFile(
        files.CONNECTIONS_FILE,
        JSON.stringify(connections, null, 2)
      );
    }
  }

  static async syncNetworksWithServer(ethMAC) {
    const GOOGLE_URL = "8.8.8.8";
    let currentNetworks = await this.readConnectionsFromFile();
    let currentNetworksToSendToServer = [];
    for (let i = 0; i < currentNetworks.wifi.length; i++) {
      let networkData = currentNetworks.wifi[i];
      networkData.type = "wifiStore";
      let networkForAPI = await prepareNetworkDataForAPI(networkData);
      currentNetworksToSendToServer.push(networkForAPI);
    }
    for (let i = 0; i < currentNetworks.eth.length; i++) {
      let networkData = currentNetworks.eth[i];
      networkData.type = "ethStore";
      let networkForAPI = await prepareNetworkDataForAPI(networkData);
      currentNetworksToSendToServer.push(networkForAPI);
    }
    let result = await NetworkApi.syncNetworks(
      ethMAC,
      JSON.stringify(currentNetworksToSendToServer)
    );
    if (result) {
      if (result.status === 0) {
        //sve zapisat u connections i dodat sve nove mreze, onda prebacit u supplicant i reconfigurirat wlan
        let connections = { wifi: [], eth: [] };
        let lastStaticIpSetting = null;
        for (const rawNetworkSetup of result.data) {
          let setup = parseNetworkSetupResult(rawNetworkSetup);
          if (
            setup.type === "wifiDataConnect" ||
            setup.type === "wifiDataStore"
          ) {
            setup.encryptionOptions = setDefaultEncryptionOptions(
              setup.encryption,
              setup.encryptionOptions || null
            );
            const wifiObject = constructWifiObject(setup);
            connections.wifi.push(wifiObject);
          } else if (
            setup.type === "ethDataConnect" ||
            setup.type === "ethDataStore"
          ) {
            const ethObject = constructEthObject(setup);
            connections.eth.push(ethObject);
            lastStaticIpSetting = ethObject;
          }
        }

        await this.backupFiles();

        await FileUtility.writeToFile(
          files.CONNECTIONS_FILE,
          JSON.stringify(connections, null, 2)
        );

        await this.blankSupplicantFile();

        for (const wifi of connections.wifi) {
          await this.setNewWifiConnection(wifi, true);
        }

        if (connections.eth.length) {
          let staticIpConnection = connections.eth[0].static;
          await this.removeInvalidEthEntryFromDhcpcdFile();
          const dhcpcdEntry = `
          interface ${device.ETH_INTERFACE}
          static ip_address=${
            staticIpConnection.ipAddress
          }/${convertSubnetMaskToCIDRFormat(staticIpConnection.subnetMask)}
          static routers=${
            staticIpConnection.defaultGateway
          } ${determineDnsNameservers(staticIpConnection)}`;

          await FileUtility.appendToFile(files.DHCPCD_FILE, dhcpcdEntry);
        }

        try {
          let reconfigureOutput = await this.reconfigureWlan();
          if (reconfigureOutput.toString().replace("\n", "") == "FAIL") {
            await this.restoreBackups();
          } else {
            await this.restartNetworkingService();

            await CommandUtility.pauseExecution(15000);

            if (connections.eth.length) {
              let googleStatus = await this.pingServer(
                GOOGLE_URL,
                device.ETH_INTERFACE
              );
              if (googleStatus === "Ping fail") {
                await this.removeInvalidEthEntryFromDhcpcdFile();
                if (connections.wifi.length) {
                  await this.reconfigureWlan();
                }
                await this.restartNetworkingService();
                await CommandUtility.pauseExecution(10000);
              }
            }
          }
        } catch (err) {
          await this.restoreBackups();
        }
      } else if (result.status === 1) {
        //samo zapisat nove stvari u connections, a ne dirat supplicant
        let connections = { wifi: [], eth: [] };
        for (const rawNetworkSetup of result.data) {
          let setup = parseNetworkSetupResult(rawNetworkSetup);
          if (
            setup.type === "wifiDataConnect" ||
            setup.type === "wifiDataStore"
          ) {
            setup.encryptionOptions = setDefaultEncryptionOptions(
              setup.encryption,
              setup.encryptionOptions || null
            );
            const wifiObject = constructWifiObject(setup);
            connections.wifi.push(wifiObject);
          } else if (
            setup.type === "ethDataConnect" ||
            setup.type === "ethDataStore"
          ) {
            const ethObject = constructEthObject(setup);
            connections.eth.push(ethObject);
          }
        }

        await FileUtility.writeToFile(
          files.CONNECTIONS_FILE,
          JSON.stringify(connections, null, 2)
        );
      }
    }
    return;
  }

  static async setNetworkSetupIdToConnection(type, id, networkSetupId) {
    const connections = await readConnectionSettingsFromFile(
      files.CONNECTIONS_FILE
    );

    const connection = connections[type].find((conn) => conn.id === id);
    const connectionIndex = connections[type].findIndex(
      (conn) => conn.id === id
    );

    connection.networkSetupId = networkSetupId;
    connections[type][connectionIndex] = connection;

    await FileUtility.writeToFile(
      files.CONNECTIONS_FILE,
      JSON.stringify(connections, null, 2)
    );
    return;
  }

  static async getConnectionFromFile(type, id) {
    const connections = await readConnectionSettingsFromFile(
      files.CONNECTIONS_FILE
    );

    const connection = connections[type].find((conn) => conn.id === id);
    return connection;
  }

  static async getConnectionFromFileByNetworkSetupId(type, networkSetupId) {
    const connections = await readConnectionSettingsFromFile(
      files.CONNECTIONS_FILE
    );

    const connection = connections[type].find(
      (conn) => conn.networkSetupId === networkSetupId
    );
    return connection;
  }

  static async removeInvalidWifiConnectionFromFile(id) {
    const connections = await readConnectionSettingsFromFile(
      files.CONNECTIONS_FILE
    );

    const wifiConnsWithoutInvalidData = connections.wifi.filter(
      (conn) => conn.id !== id
    );
    connections.wifi = wifiConnsWithoutInvalidData;

    await FileUtility.writeToFile(
      files.CONNECTIONS_FILE,
      JSON.stringify(connections, null, 2)
    );
    return;
  }

  static async setWifiConnectionPriorityByNetworkSetupId(
    networkSetupId,
    priority
  ) {
    const connections = await readConnectionSettingsFromFile(
      files.CONNECTIONS_FILE
    );

    const connectionIndex = connections.wifi.findIndex(
      (conn) => conn.networkSetupId === networkSetupId
    );
    connections.wifi[connectionIndex].priority = priority;

    await FileUtility.writeToFile(
      files.CONNECTIONS_FILE,
      JSON.stringify(connections, null, 2)
    );
    return;
  }

  static async resetWifiConnectionsPriority() {
    const connections = await readConnectionSettingsFromFile(
      files.CONNECTIONS_FILE
    );

    connections.wifi.forEach((conn) => (conn.priority = 1));

    await FileUtility.writeToFile(
      files.CONNECTIONS_FILE,
      JSON.stringify(connections, null, 2)
    );
    return;
  }

  static async isEthConnectionCurrentlyUsed(id) {
    const connections = await readConnectionSettingsFromFile(
      files.CONNECTIONS_FILE
    );

    const ethConnection = connections.eth.find((conn) => conn.id === id);
    return ethConnection.isUsed;
  }

  async isAnyEthConnectionUsed() {
    const connections = await readConnectionSettingsFromFile(CONNECTIONS_FILE);

    return connections.eth.some((conn) => conn.isUsed === true);
  }

  static async setEthConnectionUsedPropertyByNetworkSetupId(
    networkSetupId,
    isUsed
  ) {
    const connections = await readConnectionSettingsFromFile(
      files.CONNECTIONS_FILE
    );

    const connectionIndex = connections.eth.findIndex(
      (conn) => conn.networkSetupId === networkSetupId
    );
    connections.wifi[connectionIndex].isUsed = isUsed;

    await FileUtility.writeToFile(
      filesCONNECTIONS_FILE,
      JSON.stringify(connections, null, 2)
    );
    return;
  }

  static async resetEthConnectionsUsedProperty() {
    const connections = await readConnectionSettingsFromFile(
      files.CONNECTIONS_FILE
    );

    connections.eth.forEach((conn) => (conn.isUsed = false));

    await FileUtility.writeToFile(
      files.CONNECTIONS_FILE,
      JSON.stringify(connections, null, 2)
    );
    return;
  }

  static async removeInvalidEthConnectionFromFile(id) {
    const connections = await readConnectionSettingsFromFile(
      files.CONNECTIONS_FILE
    );

    const ethConnsWithoutInvalidData = connections.eth.filter(
      (conn) => conn.id !== id
    );
    connections.eth = ethConnsWithoutInvalidData;

    await FileUtility.writeToFile(
      files.CONNECTIONS_FILE,
      JSON.stringify(connections, null, 2)
    );
    return;
  }

  static async setNewWifiConnection(data, doNotSaveToConnectionsFile) {
    if (!doNotSaveToConnectionsFile) {
      data.encryptionOptions = setDefaultEncryptionOptions(
        data.encryption,
        data.encryptionOptions || null
      );
    }

    const supplicantEntry = `
    network={
    ssid="${data.ssid}"
    scan_ssid=1
    priority=${data.priority} ${determinePassword(
      data.password,
      data.encryption
    )} ${determineConnectionSettings(
      data.encryption,
      data.encryptionOptions || {}
    )}}`;

    if (data.includeStatic === "true") {
      const dhcpcdEntry = `
      ssid ${data.ssid}
      static ip_address=${data.ipAddress}/${convertSubnetMaskToCIDRFormat(
        data.subnetMask
      )}
      static routers=${data.defaultGateway} ${determineDnsNameservers(data)}`;

      await FileUtility.appendToFile(files.DHCPCD_FILE, dhcpcdEntry);
    }

    await this.resetWifiConnectionsPriority();
    await FileUtility.appendToFile(files.WPA_SUPPLICANT_FILE, supplicantEntry);
    if (!doNotSaveToConnectionsFile) {
      return await writeConnectionSettingsToFile(files.CONNECTIONS_FILE, data);
    } else {
      return;
    }
  }

  static async setNewEthConnection(data) {
    const dhcpcdEntry = `
    interface ${device.ETH_INTERFACE}
    static ip_address=${data.ipAddress}/${convertSubnetMaskToCIDRFormat(
      data.subnetMask
    )}
    static routers=${data.defaultGateway} ${determineDnsNameservers(data)}`;

    if (await this.isAnyEthConnectionUsed()) {
      await this.removeInvalidEthEntryFromDhcpcdFile();
    }

    await FileUtility.appendToFile(DHCPCD_FILE, dhcpcdEntry);
    return await writeConnectionSettingsToFile(CONNECTIONS_FILE, data);
  }

  static async restartNetworkingService() {
    return await CommandUtility.execCommand(
      `systemctl restart dhcpcd.service`
    );
  }

  static async turnOffInterface(netInterface) {
    return await CommandUtility.execCommand(
      `ifconfig ${netInterface} down`
    );
  }

  static async turnOnInterface(netInterface) {
    return await CommandUtility.execCommand(
      `ifconfig ${netInterface} up`
    );
  }

  static async reconfigureWlan() {
    return await CommandUtility.execCommand(
      `wpa_cli -i ${device.WIFI_INTERFACE} reconfigure`
    );
  }

  static async changeCountryCode(code) {
    return await CommandUtility.execCommand(
      `sed -i 's/country=\w*[A-Z]\w*[A-Z]\w*/country=${code}/g' ${files.WPA_SUPPLICANT_FILE}`
    );
  }

  static async blankSupplicantFile() {
    let requiredLines = "";
    requiredLines += `ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\n`;
    requiredLines += `update_config=1\n`;
    let countryLine = await getCountryLine();
    requiredLines += countryLine ? countryLine : "country=HR\n";

    await FileUtility.deleteFile(files.WPA_SUPPLICANT_FILE);
    await FileUtility.writeToFile(files.WPA_SUPPLICANT_FILE, requiredLines);
    return;
  }

  static async restoreValidConnectionsToSupplicantFile() {
    const storedConnections = await readConnectionSettingsFromFile(
      files.CONNECTIONS_FILE
    );

    let validConnections = "";
    storedConnections.wifi.forEach((conn) => {
      const supplicantEntry = `
      network={
      ssid="${conn.ssid}"
      scan_ssid=1
      priority=${conn.priority} ${determinePassword(
        conn.password,
        conn.encryption
      )} ${determineConnectionSettings(
        conn.encryption,
        conn.encryptionOptions || {}
      )}}`;

      validConnections += supplicantEntry;
    });

    await this.blankSupplicantFile();
    await FileUtility.appendToFile(files.WPA_SUPPLICANT_FILE, validConnections);

    return;
  }

  static async removeInvalidWifiEntryFromDhcpcdFile(ssid) {
    const invalidEntry = await CommandUtility.execCommand(
      `cat ${files.DHCPCD_FILE} | grep "ssid ${ssid}" -A 3`
    );
    const currentDhcpcdFile = await FileUtility.readFromFile(files.DHCPCD_FILE);
    const dhcpcdFileWithoutInvalidEntry = currentDhcpcdFile.replace(
      invalidEntry,
      ""
    );
    await FileUtility.writeToFile(
      files.DHCPCD_FILE,
      dhcpcdFileWithoutInvalidEntry
    );
    return;
  }

  static async removeInvalidEthEntryFromDhcpcdFile() {
    const invalidEntry = await CommandUtility.execCommand(
      `cat ${files.DHCPCD_FILE} | grep -v "#interface ${device.ETH_INTERFACE}" | grep "interface ${device.ETH_INTERFACE}" -A 3`
    );
    const currentDhcpcdFile = await FileUtility.readFromFile(files.DHCPCD_FILE);
    const dhcpcdFileWithoutInvalidEntry = currentDhcpcdFile.replace(
      invalidEntry,
      ""
    );
    await FileUtility.writeToFile(
      files.DHCPCD_FILE,
      dhcpcdFileWithoutInvalidEntry
    );
    return;
  }

  static async restoreUsedEthConnectionToDhcpcdFile() {
    const connections = await readConnectionSettingsFromFile(
      files.CONNECTIONS_FILE
    );
    const usedEthConn = connections.eth.find((conn) => conn.isUsed);

    if (usedEthConn) {
      const dhcpcdEntry = `
      interface ${device.ETH_INTERFACE}
      static ip_address=${
        usedEthConn.ipAddress
      }/${convertSubnetMaskToCIDRFormat(usedEthConn.subnetMask)}
      static routers=${usedEthConn.defaultGateway} ${determineDnsNameservers(
        usedEthConn
      )}`;

      return await FileUtility.appendToFile(files.DHCPCD_FILE, dhcpcdEntry);
    }

    return;
  }

  static async networkCheck(netInterface) {
    const SCREENS_URL = "screens.dbtouch.com";
    const GOOGLE_URL = "8.8.8.8";

    let googleStatus = await this.pingServer(GOOGLE_URL, netInterface);
    let screensStatus = await this.pingServer(SCREENS_URL, netInterface);

    return {
      googleStatus: googleStatus,
      screensStatus: screensStatus,
    };
  }

  static async resetFaultyWifiConnection(data) {
    await this.turnOffInterface(device.WIFI_INTERFACE);

    await this.removeInvalidWifiConnectionFromFile(data.id);
    await this.restoreValidConnectionsToSupplicantFile();
    if (data.includeStatic === "true")
      await this.removeInvalidWifiEntryFromDhcpcdFile(data.ssid);

    await this.turnOnInterface(device.WIFI_INTERFACE);
    await this.reconfigureWlan();
    await this.restartNetworkingService();

    return;
  }

  static async resetFaultyEthConnection(data) {
    await this.turnOffInterface(device.ETH_INTERFACE);

    await this.removeInvalidEthConnectionFromFile(data.id);
    await this.removeInvalidEthEntryFromDhcpcdFile();

    await this.turnOnInterface(device.ETH_INTERFACE);
    await this.restartNetworkingService();

    return;
  }

  static async pingServer(address, netInterface) {
    const commandOutput = await CommandUtility.execCommand(
      `ping ${address} -I ${netInterface} -c 6 -q | grep "6 packets"`
    );
    return isPingSuccessful(commandOutput) ? "Ping success" : "Ping fail";
  }

  static async backupFiles() {
    await CommandUtility.execCommand(
      `cp ${files.CONNECTIONS_FILE} ${files.CONNECTIONS_FILE_BACKUP}`
    );
    await CommandUtility.execCommand(
      `cp ${files.DHCPCD_FILE} ${files.DHCPCD_FILE_BACKUP}`
    );
    await CommandUtility.execCommand(
      `cp ${files.WPA_SUPPLICANT_FILE} ${files.WPA_SUPPLICANT_FILE_BACKUP}`
    );
  }

  static async restoreBackups() {
    await CommandUtility.execCommand(`rm ${files.CONNECTIONS_FILE}`);
    await CommandUtility.execCommand(`rm ${files.DHCPCD_FILE}`);
    await CommandUtility.execCommand(`rm ${files.WPA_SUPPLICANT_FILE}`);
    await CommandUtility.execCommand(
      `mv ${files.CONNECTIONS_FILE_BACKUP} ${files.CONNECTIONS_FILE}`
    );
    await CommandUtility.execCommand(
      `mv ${files.DHCPCD_FILE_BACKUP} ${files.DHCPCD_FILE}`
    );
    await CommandUtility.execCommand(
      `mv ${files.WPA_SUPPLICANT_FILE_BACKUP} ${files.WPA_SUPPLICANT_FILE}`
    );

    await this.reconfigureWlan();
    await this.restartNetworkingService();
  }

  static async initialCheckUpOfInternetConnections() {
    const GOOGLE_URL = "8.8.8.8";
    const connections = await readConnectionSettingsFromFile(
      files.CONNECTIONS_FILE
    );
    if (connections.eth.length) {
      let staticIpConnection = connections.eth[0].static;
      await this.removeInvalidEthEntryFromDhcpcdFile();
      const dhcpcdEntry = `
      interface ${device.ETH_INTERFACE}
      static ip_address=${
        staticIpConnection.ipAddress
      }/${convertSubnetMaskToCIDRFormat(staticIpConnection.subnetMask)}
      static routers=${
        staticIpConnection.defaultGateway
      } ${determineDnsNameservers(staticIpConnection)}`;

      await FileUtility.appendToFile(files.DHCPCD_FILE, dhcpcdEntry);

      await this.restartNetworkingService();

      await CommandUtility.pauseExecution(10000);

      let googleStatus = await this.pingServer(
        GOOGLE_URL,
        device.ETH_INTERFACE
      );
      if (googleStatus === "Ping success") {
        return;
      } else {
        await this.removeInvalidEthEntryFromDhcpcdFile();
        if (connections.wifi.length) {
          await this.reconfigureWlan();
        }
        await this.restartNetworkingService();
        await CommandUtility.pauseExecution(10000);
        return;
      }
    } else {
      return;
    }
  }
}

function parseScanOutput(output) {
  let trimmedOutput = output.replace(/^\s+/gm, "");
  trimmedOutput = trimmedOutput.split("\n");

  let networks = [];
  let networkInfo = {};

  let line = "";
  const fields = {
    mac: /^Cell \d+ - Address: (.*)/,
    ssid: /^ESSID:"(.*)"/,
    channel: /^Channel:(.*)/,
    mode: /^Mode:(.*)/,
    frequency: /^Frequency:(.*)/,
    encryption_key: /Encryption key:(.*)/,
    bitrates: /Bit Rates:(.*)/,
    quality: /Quality(?:=|\:)([^\s]+)/,
    signal_level: /Signal level(?:=|\:)([^\s]+)/,
    wpa: /^IE: WPA(.*)/,
    wpa2: /^IE: IEEE 802.11i\/(.*)/,
  };

  for (let i = 0; i < trimmedOutput.length; i++) {
    line = trimmedOutput[i].trim();

    if (!line.length) {
      continue;
    }
    if (line.match("Scan completed :$")) {
      continue;
    }
    if (line.match("Interface doesn't support scanning.$")) {
      continue;
    }

    if (line.match(fields.mac)) {
      networks.push(networkInfo);
      networkInfo = {};
    }

    for (let field in fields) {
      if (line.match(fields[field])) {
        networkInfo[field] = fields[field].exec(line)[1].trim();
      }
    }
  }
  networks.push(networkInfo);

  const networksWithoutEmptyInfo = networks.filter(
    (network) => Object.keys(network).length !== 0
  );
  networksWithoutEmptyInfo.forEach((network) => {
    if (network["encryption_key"] === "off") {
      network.security = "OPEN";
      return;
    }

    if (network.hasOwnProperty("wpa") || network.hasOwnProperty("wpa2")) {
      network.security = "WPA / WPA2";
      return;
    }

    network.security = "WEP";
  });

  return networksWithoutEmptyInfo;
}

function parseNetworkSetupResult(result) {
  if (result === null) {
    return null;
  }

  return {
    networkSetupId: result.id || null,
    networkType:
      result.networkType === 1 ? device.ETH_INTERFACE : device.WIFI_INTERFACE,
    type: determineSetupTypeAndAction(result),
    ssid: result.ssid || null,
    priority: 2,
    password: result.password || null,
    countryLocale: result.countryLocale || null,
    includeStatic:
      result.hasStaticIp !== null && result.hasStaticIp ? "true" : "false",
    ipAddress: result.ipAddress || null,
    subnetMask: result.subnetMask || null,
    defaultGateway: result.defaultGateway || null,
    preferredDns: result.preferredDns || "",
    alternativeDns: result.alternativeDns || "",
    encryption:
      result.encryption !== undefined && result.encryption
        ? result.encryption.type
        : null,
    encryptionOptions: result.encryption || null,
  };
}

function determineSetupTypeAndAction(setup) {
  if (setup.setupAction === 1 && setup.networkType === 1) {
    return "ethDataConnect";
  } else if (setup.setupAction === 2 && setup.networkType === 1) {
    return "ethDataStore";
  } else if (setup.setupAction === 1 && setup.networkType === 2) {
    return "wifiDataConnect";
  } else if (setup.setupAction === 2 && setup.networkType === 2) {
    return "wifiDataStore";
  }
}

async function prepareNetworkDataForAPI(data) {
  let setup = {
    networkType: data.type.includes("eth") ? 1 : 2,
    setupAction: data.type.includes("Store") ? 2 : 1,
    ssid: data.ssid || null,
    networkSetupId: data.networkSetupId || null,
    password: data.password || null,
    countryLocale: data.countryLocale || null,
    hasStaticIp: data.static !== undefined ? true : false,
    ipAddress: data.static !== undefined ? data.static.ipAddress : null,
    subnetMask: data.static !== undefined ? data.static.subnetMask : null,
    defaultGateway:
      data.static !== undefined ? data.static.defaultGateway : null,
    preferredDns: data.static !== undefined ? data.static.preferredDns : null,
    alternativeDns:
      data.static !== undefined ? data.static.alternativeDns : null,
    encryption: JSON.stringify(data.encryptionOptions) || null,
  };

  for (const key of Object.keys(setup)) {
    if (setup[key] === null || setup[key] === undefined) {
      delete setup[key];
    }
  }

  return setup;
}

async function readConnectionSettingsFromFile(file) {
  const contents = await FileUtility.readFromFile(file);
  return JSON.parse(contents);
}

async function writeConnectionSettingsToFile(file, data) {
  const connections = await readConnectionSettingsFromFile(file);
  let newConnectionId = "";

  if (data.type === "wifiDataConnect" || data.type === "wifiDataStore") {
    const wifiObject = constructWifiObject(data);
    newConnectionId = wifiObject.id;

    connections.wifi.push(wifiObject);
  } else if (data.type === "ethDataConnect" || data.type === "ethDataStore") {
    const ethObject = constructEthObject(data);
    newConnectionId = ethObject.id;

    connections.eth.forEach((conn) => (conn.isUsed = false));
    connections.eth.push(ethObject);
  }

  await FileUtility.writeToFile(file, JSON.stringify(connections, null, 2));
  return newConnectionId;
}

function constructWifiObject(data) {
  const { ssid, password, encryption, encryptionOptions } = data;
  let newWifiConnection = {
    id: Date.now().toString(),
    networkSetupId: data.networkSetupId || null,
    priority: data.priority,
    ssid,
    password,
    encryption,
    encryptionOptions,
  };

  if (data.includeStatic === "true") {
    const {
      ipAddress,
      subnetMask,
      defaultGateway,
      preferredDns,
      alternativeDns,
    } = data;
    newWifiConnection = Object.assign(newWifiConnection, {
      static: {
        ipAddress,
        subnetMask,
        defaultGateway,
        preferredDns,
        alternativeDns,
      },
    });
  }

  return newWifiConnection;
}

function constructEthObject(data) {
  const {
    ipAddress,
    subnetMask,
    defaultGateway,
    preferredDns,
    alternativeDns,
  } = data;
  return {
    id: Date.now().toString(),
    networkSetupId: data.networkSetupId || null,
    isUsed: true,
    static: {
      ipAddress,
      subnetMask,
      defaultGateway,
      preferredDns,
      alternativeDns,
    },
  };
}

function setDefaultEncryptionOptions(encryption, encryptionOptions) {
  if (encryptionOptions !== null) {
    return encryptionOptions;
  }

  if (encryption === "WPA / WPA2") {
    return {
      type: encryption,
      authAlg: "OPEN SHARED",
      keyMgmt: "WPA-PSK",
      pairwise: "TKIP CCMP",
      proto: "WPA RSN",
    };
  } else if (encryption === "WEP") {
    return {
      type: encryption,
      authAlg: "OPEN SHARED",
      keyMgmt: "NONE",
    };
  } else if (encryption === "OPEN") {
    return {
      type: encryption,
      authAlg: "OPEN",
      keyMgmt: "NONE",
    };
  }
}

function determinePassword(password, encryption) {
  if (encryption === "WPA / WPA2") {
    return `psk="${password}"`;
  } else if (encryption === "WEP") {
    return `
    wep_key0="${password}"
    wep_tx_keyidx=0`;
  } else if (encryption === "OPEN" || !encryption) {
    return "";
  }
}

function determineConnectionSettings(encryption, encryptionOptions) {
  if (encryption === "WPA / WPA2") {
    return `
    auth_alg=${encryptionOptions.authAlg} 
    key_mgmt=${encryptionOptions.keyMgmt}
    pairwise=${encryptionOptions.pairwise}
    proto=${encryptionOptions.proto}`;
  } else if (encryption === "WEP") {
    return `
    auth_alg=${encryptionOptions.authAlg} 
    key_mgmt=${encryptionOptions.keyMgmt}`;
  } else if (encryption === "OPEN" || !encryption) {
    return `
    auth_alg=${encryptionOptions.authAlg} 
    key_mgmt=${encryptionOptions.keyMgmt}`;
  }
}

function convertSubnetMaskToCIDRFormat(subnetMask) {
  const maskNodes = subnetMask.match(/(\d+)/g);
  let cidr = 0;

  maskNodes.forEach((node) => {
    cidr += ((node >>> 0).toString(2).match(/1/g) || []).length;
  });

  return cidr;
}

function determineDnsNameservers(dnsServers) {
  if (dnsServers.preferredDns === "" && dnsServers.alternativeDns === "") {
    return "";
  }

  if (dnsServers.preferredDns !== "" && dnsServers.alternativeDns === "") {
    return `static domain_name_servers=${dnsServers.preferredDns}`;
  }

  if (dnsServers.preferredDns === "" && dnsServers.alternativeDns !== "") {
    return `static domain_name_servers=${dnsServers.alternativeDns}`;
  }

  return `static domain_name_servers=${dnsServers.preferredDns} ${dnsServers.alternativeDns}`;
}

async function getCountryLine() {
  return await CommandUtility.execCommand(
    `cat ${files.WPA_SUPPLICANT_FILE} | grep country`
  );
}

function isPingSuccessful(pingOutput) {
  return pingOutput !== undefined &&
    pingOutput.includes("6 packets transmitted") &&
    !pingOutput.includes("100% packet loss")
    ? true
    : false;
}

export default NetworkConfiguration;
