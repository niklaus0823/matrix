"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const LibFs = require("fs-extra");
const LibPath = require("path");
const iterable_readfiles_1 = require("iterable-readfiles");
/**
 * Find project dir
 *
 * @returns {string}
 */
function getProjectDir() {
    return process.cwd();
}
exports.getProjectDir = getProjectDir;
/**
 * Find absolute filepath and add '/' at dir path last string
 *
 * @returns {string}
 */
function getAbsolutePath(relativePath) {
    let path = LibPath.join(getProjectDir(), LibPath.normalize(relativePath));
    let pathStat = LibFs.statSync(path);
    if (pathStat.isDirectory() && path.substr(path.length - 1, 1) != '/') {
        path = LibPath.join(path, '/');
    }
    return path;
}
exports.getAbsolutePath = getAbsolutePath;
/**
 * 读取文件夹内指定类型文件
 *
 * @param {string} dir
 * @param {string} extname
 * @param {Array<string>} excludes
 * @returns {Promise<Array<string>>}
 */
exports.readFiles = function (dir, extname, excludes) {
    return __awaiter(this, void 0, void 0, function* () {
        let ignoreFunction = (path, stat) => {
            let shallIgnore = (stat.isFile() && LibPath.extname(path) !== `.${extname}`);
            if (shallIgnore || !excludes || excludes.length === 0) {
                return shallIgnore;
            }
            excludes.forEach((exclude) => {
                if (path.indexOf(LibPath.normalize(exclude)) !== -1) {
                    shallIgnore = true;
                }
            });
            return shallIgnore;
        };
        let ignores = ['.DS_Store', '.git', '.idea', ignoreFunction];
        return iterable_readfiles_1.readfiles(dir, ignores);
    });
};
