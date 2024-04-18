import ApiUtility from '../utility/api-util.js';
import FileLoggerUtility from '../utility/log-util.js';
import { api } from '../utility/constants.js';

class SoftwareVersionApi {
    static async getNewSoftwareVersion(ethMAC) {
        const getNewSoftwareVersionRequestURL = `${api.BASE_URL}${api.GET_NEW_SOFTWARE_VERSION}`;

        try {
            const resJSON = await ApiUtility.getRequest(ethMAC, getNewSoftwareVersionRequestURL, null);
            return (resJSON !== null) ? resJSON.data : null;
        }
        catch(err) {
            await FileLoggerUtility.logToFile(`Error getting new software version: ${err}`);
            return null;
        }
    }

    static async downloadSoftwareVersion(fileUrl, fileDestination) {
        return await ApiUtility.downloadFile(fileUrl, fileDestination);
    }
}

module.exports = SoftwareVersionApi;