import { files, application, content } from "../utility/constants.js";
import { MpvJsonIpc } from "mpv-json-ipc";
import { exec } from "child_process";
import ProcessManager from "../process/process-manager.js";
import FileUtility from "../utility/file-util.js";
import CommandUtility from "../utility/command-util.js";
import net from "net";

// buffer times in seconds
const buffer = 2;
const liveFeedBuffer = 5;

const mediaPlayer = async () => {
  try {
    const playlistFile = await FileUtility.readFromFile(files.PLAYLIST);
    const playlist = JSON.parse(playlistFile);
    const playlistLength = playlist.content.length;

    let contentProcessList = Array(playlistLength).fill(undefined);

    let previousPositon = undefined;
    let nextPosition = 1;
    let tempBuffer = buffer;

    // loop trough the playlist and play content according to the type of it
    for (let i = 0; i < playlistLength; ) {
      // check for current content type and add content as process to list
      //#region
      let previouseContent = previousPositon
        ? playlist.content[previousPositon]
        : undefined;
      let currentContent = playlist.content[i];
      let nextContent = playlist.content[nextPosition];

      if (currentContent.type === content.PICTURE) {
        contentProcessList[i] = await picturePlayer(currentContent.filePath);
      }

      if (currentContent.type === content.VIDEO) {
        contentProcessList[i] = await videoPlayer(currentContent.filePath);
      }

      if (currentContent.type === content.LIVEFEED) {
        contentProcessList[i] = await livefeedPlayer(
          currentContent.filePath,
          currentContent.id
        );
      }
      //#endregion

      // wait buffer time
      //#region
      await CommandUtility.pauseExecution(buffer * 1000);
      //#endregion

      //#region
      if (previousPositon !== undefined) {
        if (
          !(
            currentContent.type === content.LIVEFEED &&
            previouseContent.type === content.VIDEO
          )
        ) {
          if (currentContent.type === content.LIVEFEED) {
            await CommandUtility.pauseExecution(
              (liveFeedBuffer - buffer) * 1000
            );
          }

          await killpreviouseProcess(contentProcessList[previousPositon]);
        }

        if (nextContent.type === content.LIVEFEED) {
          tempBuffer = buffer + liveFeedBuffer;

          if (currentContent.type === content.LIVEFEED) {
            await CommandUtility.pauseExecution(tempBuffer * 1000);

            await placeContentOnTop(contentProcessList[i]);
          } else {
            await placeContentOnTop(contentProcessList[i]);
          }
        } else {
          if (currentContent.type === content.LIVEFEED) {
            tempBuffer = 0;
          } else {
            tempBuffer = buffer;
          }
        }
      } else {
        tempBuffer = buffer;
      }
      //#endregion

      // condition to check the type of process and determine the way to delay loop
      //#region
      if (currentContent.type === content.VIDEO) {
        if (nextContent.type === content.LIVEFEED) {
          waitForVideoToEnd(contentProcessList[i], nextContent.type);

          await CommandUtility.pauseExecution(
            (currentContent.duration - tempBuffer) * 1000
          );
        } else {
          await waitForVideoToEnd(contentProcessList[i], currentContent.type);
        }
      } else {
        await CommandUtility.pauseExecution(
          (currentContent.duration - tempBuffer) * 1000
        );
      }
      //#endregion

      // calculate positions of contents in the list
      //#region
      if (i === playlistLength - 1) {
        previousPositon = i;
        i = 0;
        nextPosition = 1;
      } else {
        previousPositon = i;
        i = i + 1;

        if (i === playlistLength - 1) {
          nextPosition = 0;
        } else {
          nextPosition = nextPosition + 1;
        }
      }
      //#endregion
    }
  } catch (error) {
    console.log("Error in media player:", error);
  }
};

const picturePlayer = async (filePath) => {
  return await ProcessManager.createProcess(application.PICTURE_PLAYER.name, [
    ...application.PICTURE_PLAYER.flags,
    filePath,
  ]);
};

const videoPlayer = async (filePath) => {
  return await ProcessManager.createProcess(application.VIDEO_PLAYER.name, [
    "--fullscreen",
    ...application.VIDEO_PLAYER.flags,
    filePath,
  ]);
};

const livefeedPlayer = async (filePath, id) => {
  return await ProcessManager.createProcess(application.LIVEFEED_PLAYER.name, [
    ...application.LIVEFEED_PLAYER.flags,
    "--kiosk",
    `--user-data-dir=/home/multimedia/MediaPlayer/PlayerContent/browserData/${id}`,
    `--profile-directory=${id}`,
    filePath,
  ]);
};

const killpreviouseProcess = async (process, buffer) => {
  await CommandUtility.pauseExecution(buffer * 1000);

  try {
    await ProcessManager.killProcess(process.pid);
  } catch {
    console.log(`killProcess executed with exit code ${process.exitCode}`);
  }
};

const waitForVideoToEnd = async (process, nextContentType) => {
  try {
    const mpvSocket = net.createConnection(application.VIDEO_PLAYER.ipcPath);
    const jsonIpc = new MpvJsonIpc(mpvSocket);

    return new Promise((resolve) => {
      jsonIpc.on("pause", async () => {
        if (nextContentType === content.LIVEFEED) {
          await ProcessManager.killProcess(process.pid);
          resolve();
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    console.log(error);
  }
};

const placeContentOnTop = async (process) => {
  // search for window ID
  let command = `xdotool search --pid ${process.pid}`;

  exec(command, async (error, stdout) => {
    try {
      let windowsId = stdout.trim().split("\n");

      for (let i = 0; i < windowsId.length; i++) {
        let command = `wmctrl -i -r ${windowsId[i]} -b add,above`;

        await CommandUtility.execCommand(command);
      }
    } catch (error) {
      console.log(`Error executing command: ${error}`);
    }
  });
};

mediaPlayer();
