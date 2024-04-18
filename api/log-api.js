import fs from "fs";
import ApiUtility from "../utility/api-util.js";
import FileLoggerUtility from "../utility/log-util.js";
import { api, log } from "../utility/constants.js";

class LogApi {
  static async insertLog(ethMAC, logType, logString, logInfo) {
    const insertLogParams = {
      logType: logType,
      logString: logString,
      currentPlaylistId: logInfo ? logInfo.currentPlaylistId : null,
      softwareVersion: logInfo ? logInfo.softwareVersion : "",
      wifiMAC: logInfo ? logInfo.wifiMAC : null,
      ethIP: logInfo ? logInfo.ethIP : null,
      wifiIP: logInfo ? logInfo.wifiIP : null,
    };

    if (logType === log.ALIVE || logType === log.SYSTEM) {
      insertLogParams.cpu = logInfo.cpu;
      insertLogParams.ram = logInfo.ram.percent;
      insertLogParams.disk = logInfo.disk.percent;
      insertLogParams.cpuTemp = logInfo.cpuTemp;
      insertLogParams.gpuTemp = logInfo.gpuTemp;
    }

    if (logType === log.NETWORK) {
      insertLogParams.networkSetupId = logInfo.networkSetupId
        ? logInfo.networkSetupId
        : null;
    }

    const insertLogRequestURL = `${api.BASE_URL}${api.INSERT_LOG}`;

    try {
      const resJSON = await ApiUtility.postRequest(
        ethMAC,
        insertLogRequestURL,
        insertLogParams,
        5000
      );

      if (resJSON !== null) {
        await FileLoggerUtility.logToFile(resJSON.message);
        return resJSON.data !== undefined ? resJSON.data : null;
      } else {
        return null;
      }
    } catch (err) {
      await FileLoggerUtility.logToFile(`Error sending new log to API: ${err}`);
      return;
    }
  }

  static async uploadScreenshot(
    ethMAC,
    screenshotId,
    screenshotPath,
    screenshotTimestamp
  ) {
    const uploadScreenshotParams = {
      picture: fs.createReadStream(screenshotPath),
      dateTaken: new Date(screenshotTimestamp).toLocaleString(),
    };
    if (screenshotId !== null)
      uploadScreenshotParams.screenshotId = screenshotId;

    const uploadScreenshotRequestURL = `${api.BASE_URL}${api.UPLOAD_SCREENSHOT}`;

    try {
      const status = await ApiUtility.uploadFile(
        ethMAC,
        uploadScreenshotRequestURL,
        uploadScreenshotParams
      );
      return status;
    } catch (err) {
      await FileLoggerUtility.logToFile(`Error uploading screenshot: ${err}`);
      return api.STATUS.ERROR;
    }
  }

  static async uploadLogFileToAPI(ethMAC, logFilePath) {
    const uploadLogFileParams = {
      logFile: fs.createReadStream(logFilePath),
    };

    const uploadLogFileRequestURL = `${api.BASE_URL}${api.UPLOAD_LOG_FILE}`;

    try {
      const status = await ApiUtility.uploadFile(
        ethMAC,
        uploadLogFileRequestURL,
        uploadLogFileParams
      );
      return status;
    } catch (err) {
      await FileLoggerUtility.logToFile(`Error uploading log file: ${err}`);
      return api.STATUS.ERROR;
    }
  }
}

export default LogApi;
