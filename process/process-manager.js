import { spawn, fork, exec } from 'child_process';
import { promisify } from 'util';
import Kill from 'tree-kill';

const treeKill = promisify(Kill);

class ProcessManager {
    static async createProcess(processType, processData, processOptions) {
        if (processOptions === null) {
            return spawn(processType, processData);
        }
        else {
            return spawn(processType, processData, processOptions);
        }
    }

    static async execProcess(command, options){
        return exec(command, options)
    }

    static async forkProcess(modulePath, processData, processOptions) {
        if (processOptions === null) {
            return fork(modulePath, processData);
        }
        else {
            return fork(modulePath, processData, processOptions);
        }
    }

    static async destroyProcessGroup(processGroupId) {
        return await treeKill(processGroupId, 'SIGTERM');
    }

    static async destroyProcess(processId) {
        return process.kill(processId, 'SIGTERM');
    }

    static async killProcess(pid){
        return process.kill(pid)
    }
}

export default ProcessManager;