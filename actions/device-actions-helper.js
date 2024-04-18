import { action, actionNames, device, displayImages } from '../utility/constants.js';
import CommandUtility from '../utility/command-util.js';
import ApiLogger from '../logger/api-logger.js';
import OSConfiguration from '../configuration/os-config.js';
import NetworkConfiguration from '../configuration/network-config.js';
import ContentManager from '../content/content-manager.js';

class DeviceActionsHelper {
    static async getRestartAction(ethMAC) {
        const action = this.getRestartAction(ethMAC);
        return action;
    }

    static async getDeviceAction(ethMAC) {
        const action = await this.getDeviceAction(ethMAC);
        return action;
    }

    static async performDeviceAction(ethMAC, receivedAction) {
        if (receivedAction === null) {
            return await ApiLogger.insertGetDeviceActionLog(ethMAC, 'error', receivedAction);
        }
        await ApiLogger.insertGetDeviceActionLog(ethMAC, 'success', actionNames[receivedAction.name]?actionNames[receivedAction.name]:receivedAction);


        if (receivedAction.name === action.REBOOT) {
            await ApiLogger.insertSystemLog(ethMAC, 'Device REBOOTING!');
            await OSConfiguration.rebootDevice();
        }
        else if (receivedAction.name === action.TAKE_SCREENSHOT) {
            await ApiLogger.uploadNewScreenshot(ethMAC, null);
        }
        else if (receivedAction.name === action.UPLOAD_CONFIG_FILE) {
            await OSConfiguration.uploadConfigurationFile(ethMAC);
        }
        else if (receivedAction.name === action.UPLOAD_LOG_FILE) {
            await ApiLogger.uploadLogFileToAPI(ethMAC);
        }
        else if (receivedAction.name === action.DELETE_ALL_CONTENT) {
            handleDeleteAllContentAction(this.contentManager);
        }
        else if (receivedAction.name === action.DELETE_ALL_NETWORKS) {
            handleDeleteAllNetworksAction(this.networkConfig);
        }
        else if (receivedAction.name === action.DELETE_NETWORK) {
            handleDeleteNetworkAction(receivedAction, this.networkConfig);
        }
        else if (receivedAction.name === action.CONNECT_TO_NETWORK) {
            handleConnectToNetwork(receivedAction, this.networkConfig);
        }
    }
}

async function handleDeleteAllContentAction() {
    const activePlaylistInfo = await ContentManager.getActivePlaylist();

    await ContentManager.stopContentPlayer();
    await ContentManager.stopTemporaryContentPlayer();

    await ContentManager.deletePlaylistFolderAndContent(activePlaylistInfo.pathToFolder);
    await ContentManager.deleteTemporaryContentFolderAndFiles();
    await ContentManager.deleteActivePlaylistFile();

    await ContentManager.createInitialActivePlaylist();
    execCommand(`feh --scale-down --auto-zoom --fullscreen --hide-pointer --no-menus --quiet --borderless ${displayImages.NO_CONTENT} &`)
}

async function handleDeleteAllNetworksAction() {
    const networkData = await NetworkConfiguration.getAllNetworkData();
            
    if (singleConnectionRemains(networkData.storedConnections)) {
        return;
    }

    const allConnections = findUnusedConnections(networkData.storedConnections, networkData.wifiSSID);
    const connectionsToDelete = allConnections.connectionsToDelete;
    const connectionsToLeave = allConnections.connectionsToLeave;

    await NetworkConfiguration.afterDeleteAllNetworks(networkData.ethMAC, connectionsToLeave)

    await NetworkConfiguration.turnOffInterface(device.WIFI_INTERFACE);
    await NetworkConfiguration.turnOffInterface(device.ETH_INTERFACE);

    for (const wifiConn of connectionsToDelete.wifi) {
        deleteWifiConnection(wifiConn);
    }

    for (const ethConn of connectionsToDelete.eth) {
        deleteEthConnection(ethConn);
    }
    
    await NetworkConfiguration.turnOnInterface(device.WIFI_INTERFACE);
    await NetworkConfiguration.turnOnInterface(device.ETH_INTERFACE);
    await NetworkConfiguration.reconfigureWlan();
    await NetworkConfiguration.restartNetworkingService();

    await CommandUtility.pauseExecution(10000);
}

async function handleDeleteNetworkAction(receivedAction) {
    const networkData = await NetworkConfiguration.getAllNetworkData();
            
    if (singleConnectionRemains(networkData.storedConnections)) {
        return;
    }

    await NetworkConfiguration.turnOffInterface(device.WIFI_INTERFACE);
    await NetworkConfiguration.turnOffInterface(device.ETH_INTERFACE);

    if (receivedAction.data.networkType === 'WiFi') {
        const connection = await NetworkConfiguration.getConnectionFromFileByNetworkSetupId('wifi', receivedAction.data.networkSetupId);
        if(connection){
            deleteWifiConnection(connection);
        }
    }
    else if (receivedAction.data.networkType === 'Ethernet') {
        const connection = await NetworkConfiguration.getConnectionFromFileByNetworkSetupId('eth', receivedAction.data.networkSetupId);
        if(connection){
            deleteEthConnection(connection);
        }
    }

    await NetworkConfiguration.turnOnInterface(device.WIFI_INTERFACE);
    await NetworkConfiguration.turnOnInterface(device.ETH_INTERFACE);
    await NetworkConfiguration.reconfigureWlan();
    await NetworkConfiguration.restartNetworkingService();

    await CommandUtility.pauseExecution(5000);
}

async function handleConnectToNetwork(receivedAction) {
    if (receivedAction.data.networkType === 'WiFi') {
        await connectToWifiNetwork(receivedAction);
    }
    else if (receivedAction.data.networkType === 'Ethernet') {
        await connectToEthNetwork(receivedAction);
    }
}

async function deleteWifiConnection(connection) {
    await NetworkConfiguration.removeInvalidWifiConnectionFromFile(connection.id);
    await NetworkConfiguration.restoreValidConnectionsToSupplicantFile();
    if (connection.static !== undefined) {
        await NetworkConfiguration.removeInvalidWifiEntryFromDhcpcdFile(connection.ssid);
    }
}

async function deleteEthConnection(connection) {
    await NetworkConfiguration.removeInvalidEthConnectionFromFile(connection.id);
    await NetworkConfiguration.removeInvalidEthEntryFromDhcpcdFile();
}

async function connectToWifiNetwork(receivedAction) {
    await NetworkConfiguration.turnOffInterface(device.WIFI_INTERFACE);

    await NetworkConfiguration.resetWifiConnectionsPriority();
    await NetworkConfiguration.setWifiConnectionPriorityByNetworkSetupId(receivedAction.data.networkSetupId, 2);
    await NetworkConfiguration.restoreValidConnectionsToSupplicantFile();

    await NetworkConfiguration.turnOnInterface(device.WIFI_INTERFACE);
    await NetworkConfiguration.reconfigureWlan();
    await NetworkConfiguration.restartNetworkingService();

    await CommandUtility.pauseExecution(5000);
}

async function connectToEthNetwork(receivedAction) {
    await NetworkConfiguration.turnOffInterface(device.ETH_INTERFACE);

    await NetworkConfiguration.removeInvalidEthEntryFromDhcpcdFile();
    await NetworkConfiguration.resetEthConnectionsUsedProperty();
    await NetworkConfiguration.setEthConnectionUsedPropertyByNetworkSetupId(receivedAction.data.networkSetupId, true);
    await NetworkConfiguration.restoreUsedEthConnectionToDhcpcdFile();

    await NetworkConfiguration.turnOnInterface(device.ETH_INTERFACE);
    await NetworkConfiguration.restartNetworkingService();

    await CommandUtility.pauseExecution(5000);
}

function singleConnectionRemains(storedConnections) {
    return (storedConnections.wifi.length === 1 || storedConnections.eth.length === 1) ? true : false;
}

function findUnusedConnections(storedConnections, wifiSSID) {
    const unusedConnections = {
        wifi: [],
        eth: []
    }
    const usedConnections = {
        wifi: [],
        eth: []
    }

    if (wifiSSID !== 'Not connected') {
        unusedConnections.wifi = storedConnections.wifi.filter(conn => conn.ssid !== wifiSSID);
        usedConnections.wifi = storedConnections.wifi.filter(conn => conn.ssid === wifiSSID);
    }
    else {
        unusedConnections.wifi = storedConnections.wifi;
    }
    
    unusedConnections.eth = storedConnections.eth.filter(conn => !conn.isUsed);
    usedConnections.eth = storedConnections.eth.filter(conn => conn.isUsed);
    let listOfIdsNotToDelete = []
    for (const wifiConn of usedConnections.wifi) {
        if(wifiConn.networkSetupId){
            listOfIdsNotToDelete.push(wifiConn.networkSetupId)   
        }
    }
    for (const ethConn of usedConnections.eth) {
        if(ethConn.networkSetupId){
            listOfIdsNotToDelete.push(ethConn.networkSetupId)   
        }
    }
    
    return {connectionsToDelete:unusedConnections, connectionsToLeave: listOfIdsNotToDelete};
}

export default DeviceActionsHelper;