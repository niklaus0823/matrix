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
const Utility = require("./Utility");
const LibPath = require("path");
/**
 * 读取 protoDir 文件夹内的 proto 文件名生成 ProtoFile 结构体。
 *
 * @param {string} protoDir
 * @param {string} outputDir
 * @param {Array<string>} excludes
 * @returns {Promise<Array<ProtoFile>>}
 */
exports.readProtoFiles = (protoDir, outputDir, excludes) => __awaiter(this, void 0, void 0, function* () {
    let files = yield Utility.readFiles(protoDir, 'proto', excludes);
    let protoFiles = files.map((file) => {
        // 实际上 readFiles 已经进行了前置过滤，这里再做一次过滤。
        if (LibPath.extname(file) !== '.proto') {
            return undefined;
        }
        file = file.replace(protoDir, ''); // remove base dir
        if (file.substr(0, 1) === '/') {
            file = file.substr(1);
        }
        let protoFile = {};
        protoFile.protoPath = protoDir;
        protoFile.outputPath = outputDir;
        protoFile.relativePath = LibPath.dirname(file);
        protoFile.fileName = LibPath.basename(file);
        protoFile.filePath = file;
        protoFile.pbNamespace = exports.filePathToPbNamespace(protoFile.filePath);
        protoFile.pbSvcNamespace = exports.filePathToPbServiceNamespace(protoFile.filePath);
        return protoFile;
    }).filter((value) => {
        return value !== undefined;
    });
    return Promise.resolve(protoFiles);
});
/**
 * dummy/your.proto => dummy_your_pb
 * @param {string} filePath
 * @returns {string}
 */
exports.filePathToPbNamespace = (filePath) => {
    return filePath.replace('.proto', '').replace(/\//g, '_').replace(/\./g, '_').replace(/-/g, '_') + '_pb';
};
/**
 * dummy/your.proto => dummy_your_grpc_pb
 * @param {string} filePath
 * @returns {string}
 */
exports.filePathToPbServiceNamespace = (filePath) => {
    return filePath.replace('.proto', '').replace(/\//g, '_').replace(/\./g, '_').replace(/-/g, '_') + '_grpc_pb';
};
/**
 * Generate origin protobuf definition (e.g *.proto) full file path.
 * @param {ProtoFile} protoFile
 * @returns {string}
 */
exports.genFullProtoFilePath = (protoFile) => {
    return LibPath.join(protoFile.protoPath, protoFile.relativePath, protoFile.fileName);
};
