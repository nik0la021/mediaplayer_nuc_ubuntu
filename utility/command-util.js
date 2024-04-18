import { exec } from 'child_process';
import FileLoggerUtility from './log-util.js';
import util from 'util';

const executing = util.promisify(exec);

class CommandUtility {
    static async execCommand(command) {
        try {
            const { stdout, stderr } = await executing(command);
            return stdout;
        } 
        catch(err) {
            await FileLoggerUtility.logToFile(`Error executing command: ${err}`);
        }
    }

    static async pauseExecution(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }
}

export default CommandUtility;