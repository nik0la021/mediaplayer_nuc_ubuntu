import fs from "fs";
import fetch from "node-fetch";
import { api } from "../utility/constants.js";
import { content } from "../utility/constants.js";
import CommandUtility from "../utility/command-util.js";
import ApiLogger from "../logger/api-logger.js";
import ContentApi from "../api/content-api.js";

class CommonContentHelper {
  static determineItemPathBasedOnType(item, folderPath) {
    const EXTENSION_INDEX = 1;
    const extensionRegex = /.+\.([^?]+)(\?|$)/;

    if (item.type === content.VIDEO) {
      return `${folderPath}/video-${item.id}-${item.version}.${item.videoExtension}`;
    } else if (item.type === content.LIVEFEED) {
      if (
        item.livefeedSource !== 2 &&
        item.livefeedSource !== 4 &&
        item.livefeedSource !== 5 &&
        item.livefeedSource !== 6 &&
        item.livefeedSource !== 7 &&
        item.livefeedSource !== 8 &&
        item.livefeedSource !== 11 &&
        item.livefeedSource !== 12
      ) {
        return `${folderPath}/livefeed-${item.id}-${item.version}.html`;
      } else if (item.livefeedSource === 2) {
        return `${folderPath}/livefeed-${item.id}-${item.version}/compressedFolder.zip`;
      } else if (item.livefeedSource === 4) {
        return `${folderPath}/livefeed-${item.id}-${item.version}.pdf`;
      } else if (item.livefeedSource === 5) {
        const match = item.url.match(extensionRegex);
        const extension = match[EXTENSION_INDEX];
        return `${folderPath}/livefeed-${item.id}-${item.version}.${extension}`;
      } else if (
        item.livefeedSource === 6 ||
        item.livefeedSource === 7 ||
        item.livefeedSource === 8
      ) {
        return `${folderPath}/livefeed-${item.id}-${item.version}/compressedFolder.zip`;
      } else if (item.livefeedSource === 11 || item.livefeedSource === 12) {
        return `${folderPath}/livefeed-${item.id}-${item.version}/`;
      }
    } else if (item.type === content.OFFLINE_LIVEFEED) {
      const offlineLivefeedFolderPath = createOfflineLivefeedFolder(
        item,
        folderPath
      );
      return offlineLivefeedFolderPath;
    } else if (item.type === content.PICTURE) {
      const match = item.url.match(extensionRegex);
      const extension = match[EXTENSION_INDEX];
      return `${folderPath}/picture-${item.id}-${item.version}.${extension}`;
    }
  }

  static determineRefreshScriptPath(item, folderPath) {
    return `${folderPath}/durationScript-${item.id}.sh`;
  }

  static async createCustomLivefeedPage(
    livefeed,
    path,
    updatedContent,
    status,
    ethMAC,
    playlist
  ) {
    let checkIfSameItemAlreadyDownloaded = updatedContent.filter(
      (downloadedItem) =>
        downloadedItem.id === livefeed.id &&
        downloadedItem.version === livefeed.version &&
        downloadedItem.livefeedSource === livefeed.livefeedSource
    );
    let itemDownloaded =
      checkIfSameItemAlreadyDownloaded &&
      checkIfSameItemAlreadyDownloaded.length;

    //don't refresh livefeed at all when rate is set to 0
    if (livefeed.livefeedSource === 1) {
      livefeed.filePath = livefeed.url;

      updatedContent.push(livefeed);
      await ApiLogger.insertDownloadPlaylistItemLog(
        ethMAC,
        "success",
        livefeed,
        `(${updatedContent.length}/${
          playlist && playlist.content ? playlist.content.length : "Unknown"
        })`
      );

      return;
    }

    if (livefeed.livefeedSource === 2) {
      //triba downloadad livefeed
      if (status.action === "download" && !itemDownloaded) {
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "start",
          livefeed,
          `(${updatedContent.length + 1}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );

        const result = await ContentApi.downloadPlaylistItem(
          livefeed.url,
          path
        );

        if (result.status === api.STATUS.ERROR) {
          await ApiLogger.insertDownloadPlaylistItemLog(ethMAC, "error", livefeed);
        } else if (result.status === api.STATUS.SUCCESS) {
          let pathToFolder = path.substring(0, path.lastIndexOf("/") + 1);
          await CommandUtility.execCommand(`unzip ${path} -d ${pathToFolder}`);
          await CommandUtility.execCommand(`rm ${path}`);

          livefeed.filePath = pathToFolder + `index.html`;

          updatedContent.push(livefeed);

          await ApiLogger.insertDownloadPlaylistItemLog(
            ethMAC,
            "success",
            livefeed,
            `(${updatedContent.length}/${
              playlist && playlist.content ? playlist.content.length : "Unknown"
            })`
          );
        }
      } else if (status.action === "copy" && !itemDownloaded) {
        let pathToCopyFrom = status.copyFromPath.substring(
          0,
          status.copyFromPath.lastIndexOf("/") + 1
        );
        let pathToCopyTo = path.substring(0, path.lastIndexOf("/") + 1);

        await CommandUtility.execCommand(
          `cp -a ${pathToCopyFrom}. ${pathToCopyTo}`
        );
        livefeed.filePath = pathToCopyTo + `index.html`;

        updatedContent.push(livefeed);
      } else if (itemDownloaded) {
        livefeed.filePath = pathToFolder + `index.html`;
        updatedContent.push(livefeed);
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "success",
          livefeed,
          `(${updatedContent.length}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );
      }

      return;
    }

    if (livefeed.livefeedSource === 3) {
      livefeed.filePath = `${api.FILES_BASE_URL}LiveFeedTemplates/YoutubeLivefeed/index.html?youtubeCode=${livefeed.url}`;

      updatedContent.push(livefeed);

      await ApiLogger.insertDownloadPlaylistItemLog(
        ethMAC,
        "success",
        livefeed,
        `(${updatedContent.length}/${
          playlist && playlist.content ? playlist.content.length : "Unknown"
        })`
      );

      return;
    }

    if (livefeed.livefeedSource === 4) {
      //triba downloadad livefeed
      if (status.action === "download" && !itemDownloaded) {
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "start",
          livefeed,
          `(${updatedContent.length + 1}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );

        const result = await ContentApi.downloadPlaylistItem(
          livefeed.url,
          path
        );

        if (result.status === api.STATUS.ERROR) {
          await ApiLogger.insertDownloadPlaylistItemLog(ethMAC, "error", livefeed);
        } else if (result.status === api.STATUS.SUCCESS) {
          livefeed.filePath = path;
          updatedContent.push(livefeed);
          await ApiLogger.insertDownloadPlaylistItemLog(
            ethMAC,
            "success",
            livefeed,
            `(${updatedContent.length}/${
              playlist && playlist.content ? playlist.content.length : "Unknown"
            })`
          );
        }
      } else if (status.action === "copy" && !itemDownloaded) {
        await CommandUtility.execCommand(`cp ${status.copyFromPath} ${path}`);

        livefeed.filePath = path;
        updatedContent.push(livefeed);
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "success",
          livefeed,
          `(${updatedContent.length}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );
      } else if (itemDownloaded) {
        livefeed.filePath = path;
        updatedContent.push(livefeed);
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "success",
          livefeed,
          `(${updatedContent.length}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );
      }

      return;
    }

    if (livefeed.livefeedSource === 5) {
      //triba downloadad livefeed
      if (status.action === "download" && !itemDownloaded) {
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "start",
          livefeed,
          `(${updatedContent.length + 1}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );

        const result = await ContentApi.downloadPlaylistItem(
          livefeed.url,
          path
        );

        if (result.status === api.STATUS.ERROR) {
          await ApiLogger.insertDownloadPlaylistItemLog(ethMAC, "error", livefeed);
        } else if (result.status === api.STATUS.SUCCESS) {
          livefeed.filePath = path;
          updatedContent.push(livefeed);
          await ApiLogger.insertDownloadPlaylistItemLog(
            ethMAC,
            "success",
            livefeed,
            `(${updatedContent.length}/${
              playlist && playlist.content ? playlist.content.length : "Unknown"
            })`
          );
        }
      } else if (status.action === "copy" && !itemDownloaded) {
        await CommandUtility.execCommand(`cp ${status.copyFromPath} ${path}`);

        livefeed.filePath = path;
        updatedContent.push(livefeed);
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "success",
          livefeed,
          `(${updatedContent.length}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );
      } else if (itemDownloaded) {
        livefeed.filePath = path;
        updatedContent.push(livefeed);
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "success",
          livefeed,
          `(${updatedContent.length}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );
      }

      return;
    }

    if (
      livefeed.livefeedSource === 6 ||
      livefeed.livefeedSource === 7 ||
      livefeed.livefeedSource === 8
    ) {
      //triba downloadad livefeed
      if (status.action === "download" && !itemDownloaded) {
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "start",
          livefeed,
          `(${updatedContent.length + 1}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );

        let pathToDownloadTemplateFrom = `${api.FILES_BASE_URL}LiveFeedTemplates/MultimediaClock.zip`;
        if (livefeed.livefeedSource === 7) {
          pathToDownloadTemplateFrom = `${api.FILES_BASE_URL}LiveFeedTemplates/MultimediaCountdown.zip`;
        }
        if (livefeed.livefeedSource === 8) {
          pathToDownloadTemplateFrom = `${api.FILES_BASE_URL}LiveFeedTemplates/MultiTemplate.zip`;
        }
        const result = await ContentApi.downloadPlaylistItem(
          pathToDownloadTemplateFrom,
          path
        );

        if (result.status === api.STATUS.ERROR) {
          await ApiLogger.insertDownloadPlaylistItemLog(ethMAC, "error", livefeed);
        } else if (result.status === api.STATUS.SUCCESS) {
          let pathToFolder = path.substring(0, path.lastIndexOf("/") + 1);
          await CommandUtility.execCommand(`unzip ${path} -d ${pathToFolder}`);
          await CommandUtility.execCommand(`rm ${path}`);

          livefeed.filePath = pathToFolder + `index.html`;
          if (livefeed.logoUrl) {
            let logoFileName = livefeed.logoUrl.split("/").pop();
            let logoDestination = `${pathToFolder}images/${logoFileName}`;
            const result = await ContentApi.downloadPlaylistItem(
              livefeed.logoUrl,
              logoDestination
            );
          }
          if (livefeed.backgroundImageUrl) {
            let backgroundImageFileName = livefeed.backgroundImageUrl
              .split("/")
              .pop();
            let backgroundImageDestination = `${pathToFolder}images/${backgroundImageFileName}`;
            const result = await ContentApi.downloadPlaylistItem(
              livefeed.backgroundImageUrl,
              backgroundImageDestination
            );
          }

          updatedContent.push(livefeed);

          await ApiLogger.insertDownloadPlaylistItemLog(
            ethMAC,
            "success",
            livefeed,
            `(${updatedContent.length}/${
              playlist && playlist.content ? playlist.content.length : "Unknown"
            })`
          );
        }
      } else if (status.action === "copy" && !itemDownloaded) {
        let pathToCopyFrom = status.copyFromPath.substring(
          0,
          status.copyFromPath.lastIndexOf("/") + 1
        );
        let pathToCopyTo = path.substring(0, path.lastIndexOf("/") + 1);
        await CommandUtility.execCommand(
          `cp -a ${pathToCopyFrom}. ${pathToCopyTo}`
        );
        livefeed.filePath = pathToCopyTo + `index.html`;

        updatedContent.push(livefeed);
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "success",
          livefeed,
          `(${updatedContent.length}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );
      } else if (itemDownloaded) {
        livefeed.filePath = checkIfSameItemAlreadyDownloaded[0].filePath;
        updatedContent.push(livefeed);
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "success",
          livefeed,
          `(${updatedContent.length}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );
      }

      return;
    }

    if (livefeed.livefeedSource === 9) {
      livefeed.filePath = `${api.FILES_BASE_URL}LiveFeedTemplates/WeatherTemplate/index.html${livefeed.parameters}&environment=${api.ENV}`;

      updatedContent.push(livefeed);

      await ApiLogger.insertDownloadPlaylistItemLog(
        ethMAC,
        "success",
        livefeed,
        `(${updatedContent.length}/${
          playlist && playlist.content ? playlist.content.length : "Unknown"
        })`
      );

      return;
    }

    if (livefeed.livefeedSource === 10) {
      livefeed.filePath = `${api.FILES_BASE_URL}LiveFeedTemplates/NewsTemplate/index.html${livefeed.parameters}&environment=${api.ENV}`;

      updatedContent.push(livefeed);

      await ApiLogger.insertDownloadPlaylistItemLog(
        ethMAC,
        "success",
        livefeed,
        `(${updatedContent.length}/${
          playlist && playlist.content ? playlist.content.length : "Unknown"
        })`
      );

      return;
    }

    if (livefeed.livefeedSource === 11 || livefeed.livefeedSource === 12) {
      if (!itemDownloaded) {
        if (livefeed.livefeedSource === 11) {
          livefeed.filePath = `${api.FILES_BASE_URL}LiveFeedTemplates/MulticontentNewsTemplate/index.html${livefeed.parameters}&environment=${api.ENV}`;
        } else if (livefeed.livefeedSource === 12) {
          livefeed.filePath = livefeed.url;
        }

        //skinit overlaycontent
        if (
          livefeed.livefeedOverlayContents &&
          livefeed.livefeedOverlayContents.length
        ) {
          for (let overlaycontent of livefeed.livefeedOverlayContents) {
            let object = overlaycontent.video
              ? overlaycontent.video
              : overlaycontent.picture
              ? overlaycontent.picture
              : null;
            if (object) {
              let objectFilename = object.path.split("/").pop();
              const result = await ContentApi.downloadPlaylistItem(
                object.path,
                path + objectFilename
              );
              if (result.status === api.STATUS.SUCCESS) {
                object.filePath = path + objectFilename;
                if (overlaycontent.video) {
                  overlaycontent.video = object;
                } else if (overlaycontent.picture) {
                  overlaycontent.picture = object;
                }
              }
            }
          }
        }

        updatedContent.push(livefeed);
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "success",
          livefeed,
          `(${updatedContent.length}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );
      } else if (itemDownloaded) {
        livefeed.filePath = checkIfSameItemAlreadyDownloaded[0].filePath;
        updatedContent.push(livefeed);
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "success",
          livefeed,
          `(${updatedContent.length}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );
      }

      return;
    }
  }

  static async downloadPlaylistItem(
    ethMAC,
    item,
    path,
    updatedContent,
    playlist
  ) {
    let checkIfSameItemAlreadyDownloaded = updatedContent.filter(
      (downloadedItem) =>
        downloadedItem.id === item.id &&
        downloadedItem.version === item.version &&
        downloadedItem.url === item.url
    );
    let itemDownloaded =
      checkIfSameItemAlreadyDownloaded &&
      checkIfSameItemAlreadyDownloaded.length;

    if (!itemDownloaded) {
      await ApiLogger.insertDownloadPlaylistItemLog(
        ethMAC,
        "start",
        item,
        `(${updatedContent.length + 1}/${
          playlist && playlist.content ? playlist.content.length : "Unknown"
        })`
      );

      const result = await ContentApi.downloadPlaylistItem(item.url, path);

      if (result.status === api.STATUS.ERROR) {
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "error",
          item,
          `(${updatedContent.length}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );
      } else if (result.status === api.STATUS.SUCCESS) {
        item.filePath = path;
        updatedContent.push(item);
        await ApiLogger.insertDownloadPlaylistItemLog(
          ethMAC,
          "success",
          item,
          `(${updatedContent.length}/${
            playlist && playlist.content ? playlist.content.length : "Unknown"
          })`
        );
      }

      if (item.hasOwnProperty("videoLastFrameUrl")) {
        if (item.videoLastFrameUrl !== null) {
          const response = await fetch(item.videoLastFrameUrl);

          if (response.ok) {
            let customPath = path.split(`.${item.videoExtension}`)[0] + ".jpg";

            await ContentApi.downloadPlaylistItem(
              item.videoLastFrameUrl,
              customPath
            );
            await ApiLogger.insertDownloadPlaylistItemLog(
              ethMAC,
              "success",
              item,
              `(${updatedContent.length}/${
                playlist && playlist.content
                  ? playlist.content.length
                  : "Unknown"
              } - video last frame)`
            );
          } else {
            await ApiLogger.insertDownloadPlaylistItemLog(
              ethMAC,
              "error",
              item,
              `(${updatedContent.length}/${
                playlist && playlist.content
                  ? playlist.content.length
                  : "Unknown"
              } - video last frame)`
            );
          }
        }
      }
    } else if (itemDownloaded) {
      item.filePath = checkIfSameItemAlreadyDownloaded[0].filePath;
      updatedContent.push(item);
      await ApiLogger.insertDownloadPlaylistItemLog(
        ethMAC,
        "success",
        item,
        `(${updatedContent.length}/${
          playlist && playlist.content ? playlist.content.length : "Unknown"
        })`
      );
    }

    return;
  }

  static async downloadTemporaryContentItem(
    ethMAC,
    item,
    path,
    updatedContent
  ) {
    await ApiLogger.insertDownloadTemporaryContentItemLog(ethMAC, "start", item);

    const result = await ContentApi.downloadPlaylistItem(item.url, path);
    if (result.status === api.STATUS.ERROR) {
      await ApiLogger.insertDownloadTemporaryContentItemLog(ethMAC, "error", item);
    } else if (result.status === api.STATUS.SUCCESS) {
      item.filePath = path;
      updatedContent.push(item);
      await ApiLogger.insertDownloadTemporaryContentItemLog(
        ethMAC,
        "success",
        item
      );
    }

    return;
  }

  static checkPlaylistItem(currentItem, storedContent) {
    if (!storedContent) {
      return { status: "new item", action: "download" };
    }

    const storedItem = storedContent.find(
      (item) => item.type === currentItem.type && item.id === currentItem.id
    );
    if (storedItem === undefined) {
      return { status: "new item", action: "download" };
    } else if (storedItem.version === currentItem.version) {
      return {
        status: "existing item",
        action: "copy",
        copyFromPath: storedItem.filePath,
      };
    } else {
      return { status: "existing item", action: "download" };
    }
  }
}

function createOfflineLivefeedFolder(item, playlistFolderPath) {
  const offlineLivefeedFolderPath = `${playlistFolderPath}/livefeed-${item.id}-${item.version}`;
  if (!fs.existsSync(offlineLivefeedFolderPath)) {
    fs.mkdirSync(offlineLivefeedFolderPath);
  }

  return offlineLivefeedFolderPath;
}

export default CommonContentHelper;
