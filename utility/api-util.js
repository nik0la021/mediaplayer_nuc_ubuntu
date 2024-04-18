import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";
import FileLoggerUtility from "./log-util.js";
import { api } from "./constants.js";
import { URL, URLSearchParams } from "url";
import { promisify } from "util";
import { parse } from "querystring";

class ApiUtility {
  static collectRequestData(request, callback) {
    const FORM_URLENCODED = "application/x-www-form-urlencoded";
    if (request.headers["content-type"] === FORM_URLENCODED) {
      let body = "";
      request.on("data", (chunk) => {
        body += chunk.toString();
      });
      request.on("end", () => {
        callback(parse(body));
      });
    } else {
      callback(null);
    }
  }

  static async getRequest(ethMAC, url, params) {
    const getRequestData = new URLSearchParams();
    getRequestData.append("mac", ethMAC);

    if (params !== null) {
      for (const key of Object.keys(params)) {
        getRequestData.append(key, params[key]);
      }
    }

    const getRequestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    const getRequestURL = new URL(url);
    getRequestURL.search = getRequestData;

    const response = await fetch(getRequestURL, getRequestOptions);
    const resJSON = await response.json();

    if (response.status === 200 && resJSON.status === api.STATUS.SUCCESS) {
      return resJSON;
    } else {
      await FileLoggerUtility.logToFile(resJSON.message);
      return null;
    }
  }

  static async postRequest(
    ethMAC,
    url,
    params,
    timeoutMS,
    returnJsonIfWarning
  ) {
    const postRequestData = new URLSearchParams();
    postRequestData.append("mac", ethMAC);

    if (params !== null) {
      for (const key of Object.keys(params)) {
        postRequestData.append(key, params[key]);
      }
    }

    const postRequestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: postRequestData,
      timeout: timeoutMS ? timeoutMS : 0,
    };

    const postRequestURL = url;

    const response = await fetch(postRequestURL, postRequestOptions);
    const resJSON = await response.json();

    if (
      (response.status === 200 && resJSON.status === api.STATUS.SUCCESS) ||
      (returnJsonIfWarning && response.status === 200 && resJSON.status === 1)
    ) {
      return resJSON;
    } else {
      await FileLoggerUtility.logToFile(resJSON.message);
      return null;
    }
  }

  static async downloadFile(fileUrl, filePath) {
    const response = await fetch(fileUrl);
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);

      response.body.pipe(file);
      response.body.on("error", (err) => {
        reject({ status: api.STATUS.ERROR, data: err });
      });

      file.on("finish", () => {
        resolve({ status: api.STATUS.SUCCESS });
      });

      file.on("error", (err) => {
        reject({ status: api.STATUS.ERROR, data: err });
      });
    });
  }

  static async uploadFile(ethMAC, url, params) {
    const uploadFileRequestData = new FormData();
    uploadFileRequestData.append("mac", ethMAC);

    if (params !== null) {
      for (const key of Object.keys(params)) {
        uploadFileRequestData.append(key, params[key]);
      }
    }

    const uploadFileRequestHeaders = uploadFileRequestData.getHeaders();

    const getLengthPromisified = promisify(uploadFileRequestData.getLength);
    uploadFileRequestData.getLengthPromisified = getLengthPromisified;
    const length = await uploadFileRequestData.getLengthPromisified();
    uploadFileRequestHeaders["content-length"] = length;

    const uploadFileRequestOptions = {
      method: "POST",
      headers: uploadFileRequestHeaders,
      body: uploadFileRequestData,
    };

    const uploadFileRequestURL = url;

    const response = await fetch(
      uploadFileRequestURL,
      uploadFileRequestOptions
    );
    const resJSON = await response.json();

    await FileLoggerUtility.logToFile(resJSON.message);
    return api.STATUS.SUCCESS;
  }
}

export default ApiUtility;
