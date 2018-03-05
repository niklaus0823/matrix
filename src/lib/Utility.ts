import * as LibFs from 'fs-extra';
import * as LibPath from 'path';
import {readfiles, IgnoreType, IgnoreFunction} from 'iterable-readfiles';

/**
 * Find project dir
 *
 * @returns {string}
 */
export function getProjectDir(): string {
    return process.cwd();
}

/**
 * Find absolute filepath and add '/' at dir path last string
 *
 * @returns {string}
 */
export function getAbsolutePath(relativePath: string): string {
    let path = LibPath.join(getProjectDir(), LibPath.normalize(relativePath));
    let pathStat = LibFs.statSync(path);
    if (pathStat.isDirectory() && path.substr(path.length - 1, 1) != '/') {
        path = LibPath.join(path, '/');
    }
    return path;
}

/**
 * 读取文件夹内指定类型文件
 *
 * @param {string} dir
 * @param {string} extname
 * @param {Array<string>} excludes
 * @returns {Promise<Array<string>>}
 */
export const readFiles = async function (dir: string, extname: string, excludes?: Array<string>): Promise<Array<string>> {
    let ignoreFunction: IgnoreFunction = (path: string, stat: LibFs.Stats): boolean => {
        let shallIgnore = (stat.isFile() && LibPath.extname(path) !== `.${extname}`);
        if (shallIgnore || !excludes || excludes.length === 0) {
            return shallIgnore;
        }
        excludes.forEach((exclude: string) => {
            if (path.indexOf(LibPath.normalize(exclude)) !== -1) {
                shallIgnore = true;
            }
        });
        return shallIgnore;
    };
    let ignores: Array<IgnoreType> = ['.DS_Store', '.git', '.idea', ignoreFunction];
    return readfiles(dir, ignores);
};