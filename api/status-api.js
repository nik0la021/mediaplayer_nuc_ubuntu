import ApiUtility from '../utility/api-util.js';
import FileLoggerUtility from '../utility/log-util.js';
import { api } from '../utility/constants.js';

class DeviceStatusApi {
    static async getDeviceStatus(ethMAC, activePlaylist, settingsId, settingsDateReceived, dateOfConfigurationLastReceived, configId) {
        const getDeviceStatusRequestURL = `${api.BASE_URL}${api.DEVICE_STATUS}`;

        let getDeviceStatusParams = {};
        if (activePlaylist !== null && activePlaylist.playlistId !== null && activePlaylist.playlistVersion !== null) {
            getDeviceStatusParams = {
                currentPlaylistId: activePlaylist.playlistId,
                currentPlaylistVersion: activePlaylist.playlistVersion
            }
        }

        getDeviceStatusParams.currentSettingsId = settingsId?settingsId:0;
        getDeviceStatusParams.settingsDateReceived = settingsDateReceived?new Date(settingsDateReceived):null;
        getDeviceStatusParams.dateOfConfigurationLastReceived = dateOfConfigurationLastReceived?new Date(dateOfConfigurationLastReceived):null;
        getDeviceStatusParams.currentConfigId = configId?configId:null;
        getDeviceStatusParams.doNotSendRestart = true;

        try {
            const resJSON = await ApiUtility.getRequest(ethMAC, getDeviceStatusRequestURL, getDeviceStatusParams);
            return (resJSON !== null) ? {action: resJSON.data.actionName, data: resJSON.data || null} : null;
        }
        catch(err) {
            await FileLoggerUtility.logToFile(`Error getting device status: ${err}`);
            return null;
        }
    }
}

export default DeviceStatusApi;