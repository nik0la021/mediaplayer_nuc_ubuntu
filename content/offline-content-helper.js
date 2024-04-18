import CommandUtility from "../utility/command-util.js";
import FileUtility from "../utility/file-util.js";
import ApiLogger from "../logger/api-logger.js";
import ApiUtility from "../utility/api-util.js";
import { api } from "../utility/constants.js";


class OfflineContentHelper {
  static async handleGetContentFromDeviceRequest(
    playlistFolderPath,
    requestData,
    response
  ) {
    try {
      const contentFilePath = determineFilePath(
        playlistFolderPath,
        "content.json",
        requestData
      );
      const contentFile = await readContentJSONFile(contentFilePath);

      response.end(
        JSON.stringify({
          status: api.STATUS.SUCCESS,
          message: "content.json file read successfully",
          data: contentFile,
        })
      );
    } catch (err) {
      response.end(
        JSON.stringify({
          status: api.STATUS.SUCCESS,
          message: `Error reading content.json file ${err}`,
          data: null,
        })
      );
    }
  }

  static async handleDeleteFileRequest(
    playlistFolderPath,
    requestData,
    response
  ) {
    try {
      const filePath = determineFilePath(
        playlistFolderPath,
        requestData.src,
        requestData
      );
      await FileUtility.deleteFile(filePath);
      await removeItemFromContentJSONFile(playlistFolderPath, requestData);

      response.end(
        JSON.stringify({
          status: api.STATUS.SUCCESS,
          message: "File deleted successfully",
          data: [],
        })
      );
    } catch (err) {
      response.end(
        JSON.stringify({
          status: api.STATUS.ERROR,
          message: `Error deleting file ${err}`,
          data: null,
        })
      );
    }
  }

  static async handleUpdateObjectRequest(
    playlistFolderPath,
    requestData,
    response
  ) {
    try {
      requestData.jsonObject = JSON.parse(requestData.jsonObject);
      await updateItemInContentJSONFile(playlistFolderPath, requestData);

      response.end(
        JSON.stringify({
          status: api.STATUS.SUCCESS,
          message: "Object updated successfully",
          data: [],
        })
      );
    } catch (err) {
      response.end(
        JSON.stringify({
          status: api.STATUS.ERROR,
          message: `Error updating object ${err}`,
          data: null,
        })
      );
    }
  }

  static async handleDownloadFileRequest(
    playlistFolderPath,
    requestData,
    response
  ) {
    try {
      requestData.jsonObject = JSON.parse(requestData.jsonObject);

      const itemExists = await itemExistsInContentJSONFile(
        playlistFolderPath,
        requestData
      );
      if (!itemExists) {
        await addItemToContentJSONFile(playlistFolderPath, requestData);
        response.end(
          JSON.stringify({
            status: api.STATUS.SUCCESS,
            message: `Started downloading file ${requestData.src}`,
            data: [],
          })
        );

        const filePath = requestData.dst;
        const result = await ApiUtility.downloadFile(requestData.src, filePath);
        if (result.status === api.STATUS.SUCCESS) {
          requestData.jsonObject = {
            ...requestData.jsonObject,
            localUrl: filePath,
          };
          await updateItemInContentJSONFile(playlistFolderPath, requestData);
        }
      } else {
        response.end(
          JSON.stringify({
            status: api.STATUS.SUCCESS,
            message: `File ${requestData.src} already downloading`,
            data: [],
          })
        );
      }
    } catch (err) {
      response.end(
        JSON.stringify({
          status: api.STATUS.ERROR,
          message: `Error downloading file ${err}`,
          data: null,
        })
      );
    }
  }

  static async manageOfflineLivefeedItem(
    ethMAC,
    logger,
    item,
    offlineLivefeedFolderPath,
    updatedContent,
    contentType
  ) {
    const archivePath = `${offlineLivefeedFolderPath}/offline_livefeed.tar.gz`;

    await insertLogBasedOnContentAndActionType(
      contentType,
      "start",
      item,
      logger,
      ethMAC
    );

    const result = await ApiUtility.downloadFile(item.url, archivePath);
    if (result.status === api.STATUS.ERROR) {
      await insertLogBasedOnContentAndActionType(
        contentType,
        "error",
        item,
        logger,
        ethMAC
      );
    } else if (result.status === api.STATUS.SUCCESS) {
      await extractOfflineLivefeedArchive(
        archivePath,
        offlineLivefeedFolderPath
      );
      await deleteOfflineLivefeedArchive(archivePath);

      item.filePath = `${offlineLivefeedFolderPath}/index.html`;
      updatedContent.push(item);

      await insertLogBasedOnContentAndActionType(
        contentType,
        "success",
        item,
        logger,
        ethMAC
      );
    }

    return;
  }
}

function determineFilePath(playlistFolderPath, relativeFilePath, reqData) {
  const livefeedFolderPath = `${playlistFolderPath}/livefeed-${reqData.livefeedId}-${reqData.livefeedVersion}`;
  const filePath = `${livefeedFolderPath}/${relativeFilePath}`;

  return filePath;
}

async function readContentJSONFile(filePath) {
  const contentFile = await FileUtility.readFromFile(filePath);
  return JSON.parse(contentFile);
}

async function itemExistsInContentJSONFile(playlistFolderPath, reqData) {
  const contentFilePath = determineFilePath(
    playlistFolderPath,
    "content.json",
    reqData
  );
  const contentFile = await readContentJSONFile(contentFilePath);

  const item = contentFile[reqData.jsonParentKey].find(
    (item) => item[reqData.searchByKey] === reqData.searchValue
  );

  return item !== undefined && item.hasOwnProperty("localUrl") ? true : false;
}

async function addItemToContentJSONFile(playlistFolderPath, reqData) {
  const contentFilePath = determineFilePath(
    playlistFolderPath,
    "content.json",
    reqData
  );
  const contentFile = await readContentJSONFile(contentFilePath);

  const newItem = {
    url: reqData.src,
    localUrl: null,
    ...reqData.jsonObject,
  };

  const contentFilePropertyWithItem = [
    ...contentFile[reqData.jsonParentKey],
    newItem,
  ];
  const updatedContent = {
    ...contentFile,
    [reqData.jsonParentKey]: contentFilePropertyWithItem,
  };

  return await FileUtility.writeToFile(
    contentFilePath,
    JSON.stringify(updatedContent, null, 2)
  );
}

async function updateItemInContentJSONFile(playlistFolderPath, reqData) {
  const contentFilePath = determineFilePath(
    playlistFolderPath,
    "content.json",
    reqData
  );
  const contentFile = await readContentJSONFile(contentFilePath);

  const item = contentFile[reqData.jsonParentKey].find(
    (item) => item[reqData.searchByKey] === reqData.searchValue
  );
  const itemIndex = contentFile[reqData.jsonParentKey].findIndex(
    (item) => item[reqData.searchByKey] === reqData.searchValue
  );

  const updatedItem = { ...item, ...reqData.jsonObject };
  contentFile[reqData.jsonParentKey][itemIndex] = updatedItem;

  return await FileUtility.writeToFile(
    contentFilePath,
    JSON.stringify(contentFile, null, 2)
  );
}

async function removeItemFromContentJSONFile(playlistFolderPath, reqData) {
  const contentFilePath = determineFilePath(
    playlistFolderPath,
    "content.json",
    reqData
  );
  const contentFile = await readContentJSONFile(contentFilePath);

  const contentFilePropertyWithoutItem = contentFile[
    reqData.jsonParentKey
  ].filter((item) => item[reqData.searchByKey] !== reqData.searchValue);
  const updatedContent = {
    ...contentFile,
    [reqData.jsonParentKey]: contentFilePropertyWithoutItem,
  };

  return await FileUtility.writeToFile(
    contentFilePath,
    JSON.stringify(updatedContent, null, 2)
  );
}

async function insertLogBasedOnContentAndActionType(
  contentType,
  actionType,
  item,
  ethMAC
) {
  if (contentType === "playlist-content" && actionType === "start") {
    return await ApiLogger.insertDownloadPlaylistItemLog(ethMAC, "start", item);
  } else if (contentType === "playlist-content" && actionType === "success") {
    return await ApiLogger.insertDownloadPlaylistItemLog(
      ethMAC,
      "success",
      item
    );
  } else if (contentType === "playlist-content" && actionType === "error") {
    return await ApiLogger.insertDownloadPlaylistItemLog(ethMAC, "error", item);
  } else if (contentType === "temporary-content" && actionType === "start") {
    return await ApiLogger.insertDownloadTemporaryContentItemLog(
      ethMAC,
      "start",
      item
    );
  } else if (contentType === "temporary-content" && actionType === "success") {
    return await ApiLogger.insertDownloadTemporaryContentItemLog(
      ethMAC,
      "success",
      item
    );
  } else if (contentType === "temporary-content" && actionType === "error") {
    return await ApiLogger.insertDownloadTemporaryContentItemLog(
      ethMAC,
      "error",
      item
    );
  }
}

async function extractOfflineLivefeedArchive(
  archivePath,
  offlineLivefeedFolderPath
) {
  return await CommandUtility.execCommand(
    `tar -xzf ${archivePath} --directory="${offlineLivefeedFolderPath}"`
  );
}

async function deleteOfflineLivefeedArchive(archivePath) {
  return await FileUtility.deleteFile(archivePath);
}

export default OfflineContentHelper;
