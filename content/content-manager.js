import EventEmitter from 'events';
import fs from 'fs';
import FileUtility from '../utility/file-util.js';
import CommandUtility from '../utility/command-util.js';
import TemporaryContentHelper from './temporary-content-helper.js';
import { folders } from '../utility/constants.js';


const CONTENT_FOLDER = folders.CONTENT_FOLDER;
const ACTIVE_PLAYLIST_PATH = `${CONTENT_FOLDER}/active-playlist.json`;

const CONTENT_MANAGER_SERVER_PORT = 8081;

let contentPlayer;

class ContentManager extends EventEmitter {
    static async createContentFolder() {
        if (!fs.existsSync(CONTENT_FOLDER)) {
            fs.mkdirSync(CONTENT_FOLDER);
        }
    }

    static async createInitialActivePlaylist() {
        if (!fs.existsSync(ACTIVE_PLAYLIST_PATH)) {
            const activePlaylist = {
                name: null,
                id: null,
                version: null,
                pathToFolder: null,
                pathToJSON: null
            }
            return await FileUtility.writeToFile(ACTIVE_PLAYLIST_PATH, JSON.stringify(activePlaylist, null, 2));
        }
    }

    // static async getPlaylist(ethMAC) {
    //     const playlist = await ContentApi.getPlaylist(ethMAC);
    //     return playlist;
    // }

    // static async checkPlaylistAndGetContent(ethMAC, playlist) {
    //     if (playlist === null) {
    //         return await ApiLogger.insertGetPlaylistLog(ethMAC, 'error', null);
    //     }
    //     await ApiLogger.insertGetPlaylistLog(ethMAC, 'success', playlist);

    //     const {storedPlaylist} = await this.getActivePlaylist();

    //     const playlistFolderPath = createPlaylistFolder(playlist);
    //     if (isNewPlaylist(playlist, storedPlaylist) || shouldRedownloadAllItems(playlist)) {
    //         playlist.content = await iterateOverContentItems(ethMAC, playlist, playlistFolderPath, null, false);
    //     }
    //     else {
    //         playlist.content = await iterateOverContentItems(ethMAC, playlist, playlistFolderPath, storedPlaylist.content, true);
    //     }

    //     await storePlaylistInFile(playlistFolderPath, playlist);
    //     this.emit('playlist-downloaded', playlistFolderPath, playlist);
    // }

    static async deletePlaylistFolderAndContent(playlistFolderPath) {
        if (playlistFolderPath === null) {
            return;
        }

        return await CommandUtility.execCommand(`rm -rf ${playlistFolderPath}`);
    }

    static async getActivePlaylist() {
        const activePlaylistInfo =  await readPlaylistFromFile(ACTIVE_PLAYLIST_PATH);
        
        if (activePlaylistInfo.pathToJSON === null) {
            return {pathToFolder: null, storedPlaylist: null};
        }
        else {
            try{
                const playlist =  await readPlaylistFromFile(activePlaylistInfo.pathToJSON);

                return {pathToFolder: activePlaylistInfo.pathToFolder, storedPlaylist: playlist};
            }catch(err){
                return {pathToFolder: null, storedPlaylist: null};
            }
        }
    }

    // static async setActivePlaylist(playlistFolderPath, playlist) {
    //     const activePlaylist = {
    //         name: `playlist-${playlist.playlistId}-${playlist.playlistVersion}`,
    //         id: playlist.playlistId,
    //         version: playlist.playlistVersion,
    //         pathToFolder: playlistFolderPath,
    //         pathToJSON: `${playlistFolderPath}/playlist-${playlist.playlistId}-${playlist.playlistVersion}.json`
    //     }
    //     return await FileUtility.writeToFile(ACTIVE_PLAYLIST_PATH, JSON.stringify(activePlaylist, null, 2));
    // }

    static async deleteActivePlaylistFile() {
        return await FileUtility.deleteFile(ACTIVE_PLAYLIST_PATH);
    }

    // static async getTemporaryContent(ethMAC) {
    //     const temporaryContent = await ContentApi.getTemporaryContent(ethMAC);
    //     return temporaryContent;
    // }

    // static async checkAndDownloadTemporaryContent(ethMAC, temporaryContent) {
    //     if (temporaryContent === null) {
    //         return await ApiLogger.insertGetTemporaryContentLog(ethMAC, 'error', null);
    //     }
    //     await ApiLogger.insertGetTemporaryContentLog(ethMAC, 'success');

    //     TemporaryContentHelper.createTemporaryContentFolder();
    //     temporaryContent.content = await TemporaryContentHelper.iterateOverTemporaryContentItems(ethMAC, temporaryContent);

    //     await TemporaryContentHelper.storeTemporaryContentInFile(temporaryContent);
    //     this.emit('temporary-content-downloaded');
    // }

    static async deleteTemporaryContentFolderAndFiles() {
        return await TemporaryContentHelper.deleteTemporaryContentFolder();
    }

    async startContentPlayer() {
        contentPlayer = await ProcessManager.forkProcess('./content/content-player.js', null, {detached: true});
    }

    // async stopContentPlayer() {
    //     if (Object.keys(this.contentPlayer).length > 0) {
    //         await ProcessManager.destroyProcessGroup(this.contentPlayer.pid);
    //     }
    //     await execCommand(`pkill ${application.VIDEO_PLAYER.name}`)
    //     await execCommand(`pkill ${application.PICTURE_PLAYER.name}`)
    // }

    // async startTemporaryContentPlayer() {
    //     this.temporaryContentPlayer = await ProcessManager.forkProcess('./content/content-player.js', ['temporary-content'], {detached: true});
    // }

    // async stopTemporaryContentPlayer() {
    //     if (Object.keys(this.temporaryContentPlayer).length > 0) {
    //         await ProcessManager.destroyProcessGroup(this.temporaryContentPlayer.pid);
    //     }
    //     await execCommand(`pkill ${application.VIDEO_PLAYER.name}`)
    //     await execCommand(`pkill ${application.PICTURE_PLAYER.name}`)
    // }

    // async initializeContentManagerServer() {
    //     this.contentManagerServer = createServer(async (req, res) => {
    //         res.setHeader('Access-Control-Allow-Origin', '*'); 
    //         res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    //         res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    //         if (req.method === 'POST') {
    //             const activePlaylist = await this.getActivePlaylist();
    //             collectRequestData(req, async result => {
    //                 if (result.type === 'downloadFile') {
    //                     handleDownloadFileRequest(activePlaylist.pathToFolder, result, res);
    //                 }
    //                 else if (result.type === 'updateObject') {
    //                     handleUpdateObjectRequest(activePlaylist.pathToFolder, result, res);
    //                 }
    //                 else if (result.type === 'deleteFile') {
    //                     handleDeleteFileRequest(activePlaylist.pathToFolder, result, res);
    //                 }
    //                 else if (result.type === 'getContentFromDevice') {
    //                     handleGetContentFromDeviceRequest(activePlaylist.pathToFolder, result, res);
    //                 }
    //             });
    //         }
    
    //     }).listen(CONTENT_MANAGER_SERVER_PORT);
    // }

    // async closeContentManagerServer() {
    //     this.contentManagerServer.close(async () => {
    //         await logToFile(`Content manager server on port ${CONTENT_MANAGER_SERVER_PORT} closed`);
    //     });
    // }
}

// function createPlaylistFolder(playlist) {
//     const playlistFolderPath = `${CONTENT_FOLDER}/playlist-${playlist.playlistId}-${playlist.playlistVersion}`;

//     if (!fs.existsSync(playlistFolderPath)) {
//         fs.mkdirSync(playlistFolderPath);
//     }

//     return playlistFolderPath;
// }

async function readPlaylistFromFile(playlistFilePath) {
    if (playlistFilePath === null) {
        return null;
    }

    const playlist = await FileUtility.readFromFile(playlistFilePath);
    return JSON.parse(playlist);
}

// async function storePlaylistInFile(playlistFolderPath, playlist) {
//     const playlistFilePath = `${playlistFolderPath}/playlist-${playlist.playlistId}-${playlist.playlistVersion}.json`;
//     return await FileUtility.writeToFile(playlistFilePath, JSON.stringify(playlist, null, 2));
// }

// function isNewPlaylist(playlist, storedPlaylist) {
//     if (storedPlaylist === null) {
//         return true;
//     }

//     return (storedPlaylist.playlistId !== playlist.playlistId) ? true : false;
// }

// function shouldRedownloadAllItems(playlist) {
//     return playlist.redownload;
// }

// function createCustomHTMLLivefeedFolder(playlist, item) {
//     const playlistFolderPath = `${CONTENT_FOLDER}/playlist-${playlist.playlistId}-${playlist.playlistVersion}/livefeed-${item.id}-${item.version}`;

//     if (!fs.existsSync(playlistFolderPath)) {
//         fs.mkdirSync(playlistFolderPath);
//     }

//     return playlistFolderPath;
// }

// async function iterateOverContentItems(ethMAC, contentApi, logger, playlist, playlistFolderPath, storedContent, shouldCheck) {
//     const updatedContent = [];

//     try {
//         for (const item of playlist.content) {
//             const path = determineItemPathBasedOnType(item, playlistFolderPath);

//             if (item.type === content.LIVEFEED) {
//                 const status = checkPlaylistItem(item, storedContent);
//                 if(item.livefeedSource === 2 || item.livefeedSource === 6 || item.livefeedSource === 7 || item.livefeedSource === 8 || item.livefeedSource === 11 || item.livefeedSource === 12){
//                     createCustomHTMLLivefeedFolder(playlist, item);
//                 }
//                 await createCustomLivefeedPage(item, path, updatedContent, status, logger, ethMAC, contentApi, playlist);
//                 continue;
//             }

//             if (item.type === content.OFFLINE_LIVEFEED) {
//                 await manageOfflineLivefeedItem(ethMAC, logger, item, path, updatedContent, 'playlist-content');
//                 continue;
//             }

//             if (!shouldCheck) {
//                 await downloadPlaylistItem(ethMAC, contentApi, logger, item, path, updatedContent, playlist);
//             }
//             else {
//                 const status = checkPlaylistItem(item, storedContent);
//                 if (status.action === 'download') {
//                     await downloadPlaylistItem(ethMAC, contentApi, logger, item, path, updatedContent, playlist);
//                 }
//                 else if (status.action === 'copy') {
//                     await CommandUtility.execCommand(`cp ${status.copyFromPath} ${path}`);
                    
//                     if (item.videoLastFrameUrl !== null){
//                         await CommandUtility.execCommand(`cp ${status.copyFromPath.split(`.${item.videoExtension}`)[0]+'.jpg'} ${path.split(`.${item.videoExtension}`)[0]+'.jpg'}`);
//                     }
                    
//                     item.filePath = path;
//                     updatedContent.push(item);
//                 }
//             }
//         }

//         await ApiLogger.insertDownloadAllItemsLog(ethMAC, 'success');
//     }
//     catch(err) {
//         await ApiLogger.insertDownloadAllItemsLog(ethMAC, 'error');
//     }

//     return updatedContent;
// }

export default ContentManager;