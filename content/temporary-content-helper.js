import fs from "fs";
import CommandUtility from "../utility/command-util.js";
import FileUtility from "../utility/file-util.js";
import { folders, content } from "../utility/constants.js";
import CommonContentHelper from "./common-content-helper.js";
import OfflineContentHelper from "./offline-content-helper.js";
import ApiLogger from "../logger/api-logger.js";


const TEMPORARY_CONTENT_FOLDER = `${folders.CONTENT_FOLDER}/temporary-content`;

class TemporaryContentHelper {
  static createTemporaryContentFolder() {
    if (!fs.existsSync(TEMPORARY_CONTENT_FOLDER)) {
      fs.mkdirSync(TEMPORARY_CONTENT_FOLDER);
    }
  }

  static async deleteTemporaryContentFolder() {
    return await CommandUtility.execCommand(
      `rm -rf ${TEMPORARY_CONTENT_FOLDER}`
    );
  }

  static async iterateOverTemporaryContentItems(
    ethMAC,
    contentApi,
    logger,
    temporaryContent
  ) {
    const updatedContent = [];

    try {
      for (const item of temporaryContent.content) {
        const path = CommonContentHelper.determineItemPathBasedOnType(
          item,
          TEMPORARY_CONTENT_FOLDER
        );

        if (item.type === content.LIVEFEED) {
          if (
            item.livefeedSource === 2 ||
            item.livefeedSource === 6 ||
            item.livefeedSource === 7 ||
            item.livefeedSource === 8 ||
            item.livefeedSource === 11 ||
            item.livefeedSource === 12
          ) {
            createCustomHTMLLivefeedFolder(item);
          }
          await CommonContentHelper.createCustomLivefeedPage(
            item,
            path,
            updatedContent,
            { action: "download" },
            logger,
            ethMAC,
            contentApi
          );
          continue;
        }

        if (item.type === content.OFFLINE_LIVEFEED) {
          await OfflineContentHelper.manageOfflineLivefeedItem(
            ethMAC,
            logger,
            item,
            path,
            updatedContent,
            "temporary-content"
          );
          continue;
        }

        await CommonContentHelper.downloadTemporaryContentItem(
          ethMAC,
          contentApi,
          logger,
          item,
          path,
          updatedContent
        );
      }

      await ApiLogger.insertDownloadAllTemporaryContentLog(ethMAC, "success");
    } catch (err) {
      console.log(err);
      await ApiLogger.insertDownloadAllTemporaryContentLog(ethMAC, "error");
    }

    return updatedContent;
  }

  static async storeTemporaryContentInFile(temporaryContent) {
    const temporaryContentFilePath = `${TEMPORARY_CONTENT_FOLDER}/temporary-content.json`;
    return await FileUtility.writeToFile(
      temporaryContentFilePath,
      JSON.stringify(temporaryContent, null, 2)
    );
  }
}

function createCustomHTMLLivefeedFolder(item) {
  const playlistFolderPath = `${TEMPORARY_CONTENT_FOLDER}/livefeed-${item.id}-${item.version}`;

  if (!fs.existsSync(playlistFolderPath)) {
    fs.mkdirSync(playlistFolderPath);
  }

  return playlistFolderPath;
}

export default TemporaryContentHelper;
