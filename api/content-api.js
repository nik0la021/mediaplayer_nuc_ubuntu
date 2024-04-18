import ApiUtility from '../utility/api-util.js';
import FileLoggerUtility from '../utility/log-util.js';
import { api } from '../utility/constants.js';


class ContentApi {
    static async getPlaylist(ethMAC) {
        const getPlaylistRequestURL = `${api.BASE_URL}${api.GET_PLAYLIST}`;

        try {
            const resJSON = await ApiUtility.getRequest(ethMAC, getPlaylistRequestURL, null);
            return (resJSON !== null) ? resJSON.data : null;
        }
        catch(err) {
            await FileLoggerUtility.logToFile(`Error getting playlist: ${err}`);
            return null;
        }
    }

    static async getTemporaryContent(ethMAC) {
        const getTemporaryContentRequestURL = `${api.BASE_URL}${api.GET_TEMPORARY_CONTENT}`;

        try {
            const resJSON = await ApiUtility.getRequest(ethMAC, getTemporaryContentRequestURL, null);
            return (resJSON !== null) ? resJSON.data : null;
        }
        catch(err) {
            await FileLoggerUtility.logToFile(`Error getting temporary content: ${err}`);
            return null;
        }
    }

    static async downloadPlaylistItem(fileUrl, fileDestination) {
        return await ApiUtility.downloadFile(fileUrl, fileDestination);
    }
}

export default ContentApi;