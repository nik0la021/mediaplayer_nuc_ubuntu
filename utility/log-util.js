import fs from "fs";
import FileUtility from "./file-util.js";
import { files } from "./constants.js";

const LOG_FILE_SIZE_LIMIT_IN_MB = 10;

class FileLoggerUtility {
  static async createLogFile() {
    if (!fs.existsSync(files.LOG_FILE) || logFileSizeLimitReached()) {
      await FileUtility.writeToFile(
        files.LOG_FILE,
        `**********MEDIA PLAYER LOG FILE**********\n`
      );
    }
  }

  static async logToFile(data) {
    await FileUtility.appendToFile(files.LOG_FILE, `--------------------\n`);
    await FileUtility.appendToFile(
      files.LOG_FILE,
      `${new Date().toLocaleString()} - ${data}\n`
    );
    await FileUtility.appendToFile(files.LOG_FILE, `--------------------\n`);
  }

  static async deleteLogFile() {
    await FileUtility.deleteFile(files.LOG_FILE);
  }
}

function logFileSizeLimitReached() {
  const logFileStats = fs.statSync(files.LOG_FILE);
  const logFileSizeInBytes = logFileStats.size;
  const logFileSizeInMegabytes = logFileSizeInBytes * Math.pow(2, -20);

  return logFileSizeInMegabytes >= LOG_FILE_SIZE_LIMIT_IN_MB ? true : false;
}

export default FileLoggerUtility;
