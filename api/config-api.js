import fs from 'fs';
import ApiUtility from '../utility/api-util.js';
import FileLoggerUtility from '../utility/log-util.js';
import { api } from '../utility/constants.js';


class ConfigurationApi {
    static async getDeviceSettings(ethMAC) {
        const deviceSettingsRequestURL = `${api.BASE_URL}${api.GET_DEVICE_SETTINGS}`;

        let getDeviceSettingsParams = {
            updateSettings: false
        };

        try {
            const resJSON = await ApiUtility.getRequest(ethMAC, deviceSettingsRequestURL, getDeviceSettingsParams);
            return (resJSON !== null && !resJSON.status) ? resJSON.data : null;
        } 
        catch(err) {
            await FileLoggerUtility.logToFile(`Error getting device settings: ${err}`);
            return null;
        }
    }

    static async getDeviceConfiguration(ethMAC) {
        const deviceConfigurationRequestURL = `${api.BASE_URL}${api.GET_DEVICE_CONFIGURATION}`;

        let getDeviceConfigParams = {
            // updateConfiguration: false
        };

        try {
            const resJSON = await ApiUtility.getRequest(ethMAC, deviceConfigurationRequestURL, getDeviceConfigParams);
            return (resJSON !== null) ? resJSON.data : null;
        } 
        catch(err) {
            await FileLoggerUtility.logToFile(`Error getting device configuration: ${err}`);
            return null;
        }
    }

    static async downloadConfigurationFile(fileUrl, fileDestination) {
        return await ApiUtility.downloadFile(fileUrl, fileDestination);
    }

    static async uploadConfigurationFile(ethMAC, filePath) {
        const uploadConfigurationParams = {
            configFile: fs.createReadStream(filePath)
        }
    
        const uploadConfigurationRequestURL = `${api.BASE_URL}${api.UPLOAD_DEVICE_CONFIGURATION}`;
    
        try {
            const status = await ApiUtility.uploadFile(ethMAC, uploadConfigurationRequestURL, uploadConfigurationParams);
            return status;       
        }
        catch(err) {
            await FileLoggerUtility.logToFile(`Error uploading device configuration: ${err}`);
            return;
        }
    }
}

export default ConfigurationApi;