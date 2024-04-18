import ApiUtility from '../utility/api-util.js';
import FileLoggerUtility from '../utility/log-util.js';
import { api } from '../utility/constants.js';

class DeviceActionsApi {
    static async getRestartAction(ethMAC) {
        const getRestartActionRequestURL = `${api.BASE_URL}${api.GET_RESTART_ACTION}`;

        try {
            const resJSON = await ApiUtility.getRequest(ethMAC, getRestartActionRequestURL, null);
            return (resJSON !== null) ? resJSON.data : null;
        }
        catch(err) {
            await FileLoggerUtility.logToFile(`Error getting restart action: ${err}`);
            return null;
        }
    }

    static async getDeviceAction(ethMAC) {
        const getDeviceActionRequestURL = `${api.BASE_URL}${api.GET_DEVICE_ACTION}`;

        try {
            let params = {doNotSendRestart: true}
            const resJSON = await ApiUtility.getRequest(ethMAC, getDeviceActionRequestURL, params);
            return (resJSON !== null) ? resJSON.data : null;
        }
        catch(err) {
            await FileLoggerUtility.logToFile(`Error getting device action: ${err}`);
            return null;
        }
    }
}

export default DeviceActionsApi;