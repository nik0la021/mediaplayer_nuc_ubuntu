export const mediaplayerPath = {
  MEDIA_PLAYER_FOLDER: "/home/multimedia/MediaPlayer",
};

export const folders = {
  PLAYER_SCRIPT_FOLDER: `${mediaplayerPath.MEDIA_PLAYER_FOLDER}/PlayerScripts`,
  PLAYER_FILES_FOLDER: `${mediaplayerPath.MEDIA_PLAYER_FOLDER}/PlayerFiles`,
  SCREENSHOTS_FOLDER: `${mediaplayerPath.MEDIA_PLAYER_FOLDER}/PlayerFiles/screenshots`,
  CONTENT_FOLDER: `${mediaplayerPath.MEDIA_PLAYER_FOLDER}/PlayerContent`,
  PLAYLIST_FOLDER: `${mediaplayerPath.MEDIA_PLAYER_FOLDER}/PlayerContent/playlist`,
  SOFTWARE_VERSION_FOLDER: `${mediaplayerPath.MEDIA_PLAYER_FOLDER}/SoftwareUpdate`,
};

export const files = {
  ACTIVE_PLAYLIST_FILE: `${folders.CONTENT_FOLDER}/playlist-active.json`,
  STARTUP_CLIENT_FILE: `${folders.PLAYER_SCRIPT_FOLDER}/startup/startup-client/build/index.html`,
  PLAYLIST: `${folders.PLAYLIST_FOLDER}/playlist.json`,
  CONNECTIONS_FILE: `${folders.PLAYER_FILES_FOLDER}/connections.json`,
  CONNECTIONS_FILE_BACKUP: `${folders.PLAYER_FILES_FOLDER}/connections.backup.json`,
  SETTINGS_FILE: `${folders.PLAYER_FILES_FOLDER}/device_settings.json`,
  DEVICE_DATA_FILE: `${folders.PLAYER_FILES_FOLDER}/device_data.json`,
  DEVICE_CONFIG_SHORT_FILE: `${folders.PLAYER_FILES_FOLDER}/device_config_short.json`,
  LOG_FILE: `${folders.PLAYER_FILES_FOLDER}/log.txt`,
  WPA_SUPPLICANT_FILE: "/etc/wpa_supplicant/wpa_supplicant.conf",
  WPA_SUPPLICANT_FILE_BACKUP: "/etc/wpa_supplicant/wpa_supplicantBACKUP.conf",
  DHCPCD_FILE: "/etc/dhcp/dhcpcd.conf",
  DHCPCD_FILE_BACKUP: "/etc/dhcpcdBACKUP.conf",
  CONFIG_FILE: "/boot/config.txt",
  RESTART_CRON_FILE: "/etc/cron.d/restart",
  RESTART_SCRIPT: "/home/pi/PlayerScript/actions/timedRestart.js",
  POWER_ON_CRON_FILE: "/etc/cron.d/power_on",
  DISPLAY_ON_SCRIPT: "/home/pi/PlayerScript/actions/timedDisplayOn.js",
  POWER_OFF_CRON_FILE: "/etc/cron.d/power_off",
  DISPLAY_OFF_SCRIPT: "/home/pi/PlayerScript/actions/timedDisplayOff.js",
};

export const api = {
  // BASE_URL_SECURE: 'https://multimedia.dbtouch.com/api/player',
  BASE_URL_SECURE: "https://multimedia.test.dbtouch.com/api/player",
  // BASE_URL: 'https://multimedia.dbtouch.com/api/player',
  BASE_URL: "https://multimedia.test.dbtouch.com/api/player",
  // BASE_URL: 'http://192.168.88.114:3001/api/player',
  // FILES_BASE_URL: 'https://multimediafiles.dbtouch.com/',
  FILES_BASE_URL: "https://multimediafiles.test.dbtouch.com/",
  // FILES_BASE_URL: 'http://192.168.88.114:80/multimedia',
  ENV: "test",
  NO_ACTION: 0,
  DEVICE_STATUS: "/getDeviceStatus",
  GET_DEVICE_SETTINGS: "/getDeviceSettings",
  GET_DEVICE_CONFIGURATION: "/getDeviceConfiguration",
  UPLOAD_DEVICE_CONFIGURATION: "/uploadConfigFile",
  GET_NETWORK_SETUP: "/getNetworkSetup",
  SET_NETWORK_SETUP: "/setNetworkSetup",
  DELETE_NETWORK_SETUP: "/deleteNetworkSetup",
  SYNC_NETWORKS: "/syncNetworks",
  AFTER_DELETE_ALL_NETWORKS: "/afterDeleteAllNetworks",
  INSERT_LOG: "/insertLog",
  UPLOAD_SCREENSHOT: "/uploadScreenshot",
  GET_NEW_SOFTWARE_VERSION: "/getNewSoftwareVersion",
  GET_PLAYLIST: "/getPlaylist",
  GET_TEMPORARY_CONTENT: "/getTemporaryContent",
  GET_RESTART_ACTION: "/getRestartAction",
  GET_DEVICE_ACTION: "/getDeviceAction",
  UPLOAD_LOG_FILE: "/uploadLogFile",
  STATUS: {
    SUCCESS: 0,
    ERROR: 1,
  },
};

export const device = {
  PASSKEY: 123456789,
  ETH_INTERFACE: "eno1",
  WIFI_INTERFACE: "wlp58s0",
};

export const content = {
  VIDEO: "video",
  LIVEFEED: "livefeed",
  OFFLINE_LIVEFEED: "offline_livefeed",
  PICTURE: "picture",
  MULTI_LIVEFEED: "multiLivefeed",
  OFFLINE_MULTI_LIVEFEED: "offline_multiLivefeed",
};

export const livefeedOverlayPositions = {
  TOP_RIGHT: 1,
  BOTTOM_RIGHT: 2,
  BOTTOM_LEFT: 3,
  TOP_LEFT: 4,
};

export const port = {
  STARTUP_SERVER_PORT: 8080,
  CONTENT_MANAGER_SERVER_PORT: 8081,
};

export const application = {
  PICTURE_PLAYER: {
    name: "feh",
    flags: [
      "--scale-down",
      "--auto-zoom",
      "--fullscreen",
      "--hide-pointer",
      "--no-menus",
      "--quiet",
      "--borderless",
      "--auto-rotate",
    ],
    overlayFlags: [
      "--scale-down",
      "--auto-zoom",
      "--hide-pointer",
      "--no-menus",
      "--quiet",
      "--borderless",
      "--auto-rotate",
    ],
  },
  VIDEO_PLAYER: {
    name: "mpv",
    ipcPath: "/home/multimedia/MediaPlayer/PlayerScripts/temp/mpv_ipc",
    flags: [
      "--no-border",
      "--no-osd-bar",
      "--no-osc",
      "--keep-open=yes",
      "--input-ipc-server=/home/multimedia/MediaPlayer/PlayerScripts/temp/mpv_ipc",
    ],
  },
  LIVEFEED_PLAYER: {
    name: "chromium",
    flags: [
      "--incognito",
      "--no-sandbox",
      "--no-zygote",
      "--noerrdialogs",
      "--process-per-site",
      "--no-first-run",
      "--fast-start",
      "--disable-features=TranslateUI",
    ],
  },
};
export const log = {
  ALIVE: 1,
  SETTINGS: 2,
  CONFIGURATION: 3,
  NETWORK: 4,
  SCREENSHOT: 5,
  SOFTWARE_VERSION: 6,
  PLAYLIST: 7,
  TEMPORARY_CONTENT: 8,
  SYSTEM: 9,
  LOG_FILE: 10,
  DEVICE_ACTION: 11,
  ERROR: 12,
};
export const action = {
  REBOOT: "reboot",
  TAKE_SCREENSHOT: "takeScreenshot",
  UPLOAD_LOG_FILE: "uploadLogFile",
  UPLOAD_CONFIG_FILE: "uploadConfigFile",
  DELETE_ALL_CONTENT: "deleteContent",
  DELETE_ALL_NETWORKS: "deleteNetworks",
  DELETE_NETWORK: "deleteNetwork",
  CONNECT_TO_NETWORK: "connectToNetwork",
};
export const actionNames = {
  reboot: "reboot",
  takeScreenshot: "take screenshot",
  uploadLogFile: "upload log file",
  uploadConfigFile: "upload configuration file",
  deleteContent: "delete content",
  deleteNetworks: "delete networks",
  deleteNetwork: "delete network",
  connectToNetwork: "connect to network",
};
export const deviceModes = {
  SCREENS: 1,
  INFO_CHANNEL: 2,
};
export const displayImages = {
  SPLASH: "/home/pi/PlayerScript/displayImages/multimediaSplash.png",
  NO_INTERNET: "/home/pi/PlayerScript/displayImages/NoInternetConnection.png",
  NO_CONTENT: "/home/pi/PlayerScript/displayImages/NoContent.png",
  SOFTWARE_UPDATE:
    "/home/pi/PlayerScript/displayImages/SoftwareUpdateInProcess.png",
};
