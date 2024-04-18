import ApiLogger from "../logger/api-logger.js";
import NetworkConfiguration from "../configuration/network-config.js";
import CommandUtility from "../utility/command-util.js";
import { device } from "../utility/constants.js";

async function performTimedRestart() {
  const ethMAC = await NetworkConfiguration.getMACAddress(device.ETH_INTERFACE);
  await ApiLogger.insertTimedActionLog(
    ethMAC,
    "Device going to shutdown to perform daily scheduled restart!"
  );
  await CommandUtility.execCommand("reboot");
}

performTimedRestart();
