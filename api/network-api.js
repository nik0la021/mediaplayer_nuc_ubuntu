import ApiUtility from '../utility/api-util.js';
import FileLoggerUtility from '../utility/log-util.js';
import { api } from '../utility/constants.js';

class NetworkApi {
    static async getNetworkSetup(ethMAC) {
        const getNetworkSetupRequestURL = `${api.BASE_URL}${api.GET_NETWORK_SETUP}`;

        try {
            const resJSON = await ApiUtility.getRequest(ethMAC, getNetworkSetupRequestURL, null);
            return (resJSON !== null) ? resJSON.data : null;
        }
        catch(err) {
            await FileLoggerUtility.logToFile(`Error getting network setup: ${err}`);
            return null;
        }
    }

    static async setNetworkSetup(ethMAC, setup) {
        const setNetworkSetupRequestURL = `${api.BASE_URL}${api.SET_NETWORK_SETUP}`

        try {
            const resJSON = await ApiUtility.postRequest(ethMAC, setNetworkSetupRequestURL, setup);
            return (resJSON !== null) ? resJSON.data : null;
        }
        catch(err) {
            await FileLoggerUtility.logToFile(`Error storing network setup: ${err}`);
            return null;
        }
    }

    static async deleteNetworkSetup(ethMAC, networkSetupId) {
        const deleteNetworkSetupParams = {
            networkSetupId: networkSetupId
        }

        const deleteNetworkSetupRequestURL = `${api.BASE_URL}${api.DELETE_NETWORK_SETUP}`;

        try {
            const resJSON = await ApiUtility.getRequest(ethMAC, deleteNetworkSetupRequestURL, deleteNetworkSetupParams);
            await FileLoggerUtility.logToFile(resJSON.message);
            return;
        }
        catch(err) {
            await FileLoggerUtility.logToFile(`Error deleting network setup: ${err}`);
            return;
        }
    }

    static async syncNetworks(ethMAC, networks) {
        const setNetworkSetupRequestURL = `${api.BASE_URL}${api.SYNC_NETWORKS}`
        const params = {
            currentDeviceNetworks: networks
        }
        try {
            const resJSON = await ApiUtility.postRequest(ethMAC, setNetworkSetupRequestURL, params, null, true);
            return (resJSON !== null) ? (resJSON.status==0 || resJSON.status==1?resJSON:null) : null;
        }
        catch(err) {
            await FileLoggerUtility.logToFile(`Error syncing networks: ${err}`);
            return null;
        }
    }

    static async afterDeleteAllNetworks(ethMAC, listOfNetworksIdsToLeave) {
        const setNetworkSetupRequestURL = `${api.BASE_URL}${api.AFTER_DELETE_ALL_NETWORKS}`
        const params = {
            doNotDeleteNetworksWithId: listOfNetworksIdsToLeave
        }
        try {
            const resJSON = await ApiUtility.postRequest(ethMAC, setNetworkSetupRequestURL, params);
            return (resJSON !== null) ? resJSON : null;
        }
        catch(err) {
            await FileLoggerUtility.logToFile(`Error syncing networks: ${err}`);
            return null;
        }
    }
}

export default NetworkApi;