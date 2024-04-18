import fs from 'fs';
import crypto from 'crypto';
import path from 'path';


class FileUtility {
    static async readFromFile(filePath) {
        try {
            const fileContents = await fs.promises.readFile(filePath, 'utf8');
            return fileContents;
        }
        catch(err) {
            console.log(`Error reading file ${filePath}: ${err}`);
        }
    }

    static async writeToFile(filePath, data) {
        try {
            await fs.promises.writeFile(filePath, data, 'utf8');
        }
        catch(err) {
            console.log(`Error writing to file ${filePath}: ${err}`);
        }
    }

    static async appendToFile(filePath, data) {
        try {
            await fs.promises.appendFile(filePath, data, 'utf8');
        }
        catch(err) {
            console.log(`Error appending to file ${filePath}: ${err}`);
        }
    }
    
    static async deleteFile(filePath) {
        try {
            await fs.promises.unlink(filePath);
        }
        catch(err) {
            console.log(`Error deleting file ${filePath}: ${err}`);
        }
    }

    static async calculateFileChecksum(hashAlgorithm, filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash(hashAlgorithm);
            const file = fs.createReadStream(filePath);

            file.on('error', err => reject({status: 'error', data: err}));
            file.on('data', chunk => hash.update(chunk));
            file.on('end', () => resolve({status: 'success', data: hash.digest('hex')}));
        });
    }

    static async readFilesFromDirectory(directoryPath) {
        const files = [];
        const directoryContents = (await fs.promises.readdir(directoryPath)).map(contentPath => path.join(directoryPath, contentPath));

        for (const content of directoryContents) {
            if ((await fs.promises.stat(content)).isFile()) {
                files.push(content);
            }
        }

        return files;
    }
}

export default FileUtility;