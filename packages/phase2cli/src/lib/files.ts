import fs, { Dirent, Stats } from "fs"
import path from "path"
import { fileURLToPath } from "url"

/**
 * Check a directory path
 * @param filePath <string> - the absolute or relative path.
 * @returns <boolean> true if the path exists, otherwise false.
 */
export const directoryExists = (filePath: string): boolean => fs.existsSync(filePath)

/**
 * Write a new file locally.
 * @param writePath <string> - local path for file with extension.
 * @param data <Buffer> - content to be written.
 */
export const writeFile = (writePath: string, data: Buffer): void => fs.writeFileSync(writePath, data)

/**
 * Read a new file from local storage.
 * @param readPath <string> - local path for file with extension.
 */
export const readFile = (readPath: string): string => fs.readFileSync(readPath, "utf-8")

/**
 * Get back the statistics of the provided file.
 * @param getStatsPath <string> - local path for file with extension.
 * @returns <Stats>
 */
export const getFileStats = (getStatsPath: string): Stats => fs.statSync(getStatsPath)

/**
 * Return the sub paths for each file stored in the given directory.
 * @param dirPath - the path which identifies the directory.
 * @returns
 */
export const getDirFilesSubPaths = async (dirPath: string): Promise<Array<Dirent>> => {
    // Get Dirent sub paths for folders and files.
    const subPaths = await fs.promises.readdir(dirPath, { withFileTypes: true })

    // Return Dirent sub paths for files only.
    return subPaths.filter((dirent: Dirent) => dirent.isFile())
}

/**
 * Filter all files in a directory by returning only those that match the given extension.
 * @param dir <string> - the directory.
 * @param extension <string> - the file extension.
 * @returns <Promise<Array<Dirent>>> - return the filenames of the file that match the given extension, if any
 */
export const filterDirectoryFilesByExtension = async (dir: string, extension: string): Promise<Array<Dirent>> => {
    // Get the sub paths for each file stored in the given directory.
    const cwdFiles = await getDirFilesSubPaths(dir)
    // Filter by extension.
    return cwdFiles.filter((file: Dirent) => file.name.includes(extension))
}

/**
 * Delete a directory specified at a given path.
 * @param dirPath <string> - the directory path.
 */
export const deleteDir = (dirPath: string): void => {
    fs.rmSync(dirPath, { recursive: true, force: true })
}

/**
 * Clean a directory specified at a given path.
 * @param dirPath <string> - the directory path.
 */
export const cleanDir = (dirPath: string): void => {
    deleteDir(dirPath)
    fs.mkdirSync(dirPath)
}

/**
 * Create a new directory in a specified path if not exist in that path.
 * @param dirPath <string> - the directory path.
 */
export const checkAndMakeNewDirectoryIfNonexistent = (dirPath: string): void => {
    if (!directoryExists(dirPath)) fs.mkdirSync(dirPath)
}

/**
 * Read and return an object of a local JSON file located at a specific path.
 * @param filePath <string> - the absolute or relative path.
 * @returns <any>
 */
export const readJSONFile = (filePath: string): any => {
    if (!directoryExists(filePath)) throw new Error(`File not found`)

    return JSON.parse(readFile(filePath))
}

/**
 * Write data a local .json file at a given path.
 * @param filePath <string>
 * @param data <JSON>
 */
export const writeLocalJsonFile = (filePath: string, data: JSON) => {
    fs.writeFileSync(filePath, JSON.stringify(data), "utf-8")
}

/**
 * Return the local current project directory name.
 * @returns <string> - the local project (e.g., dist/) directory name.
 */
export const getLocalDirname = (): string => {
    const filename = fileURLToPath(import.meta.url)
    return path.dirname(filename)
}

/**
 * Get a local file at a given path.
 * @param filePath <string>
 * @returns <any>
 */
export const getLocalFilePath = (filePath: string): any => path.join(getLocalDirname(), filePath)

/**
 * Read a local .json file at a given path.
 * @param filePath <string>
 * @returns <any>
 */
export const readLocalJsonFile = (filePath: string): any => readJSONFile(path.join(getLocalDirname(), filePath))
