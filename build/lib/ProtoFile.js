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
const LibPath = require("path");
const Utility = require("./Utility");
/**
 * 读取 protoDir 文件夹内的 proto 文件名生成 ProtoFile 结构体。
 *
 * @param {string} protoDir
 * @param {string} outputDir
 * @param {Array<string>} excludes
 * @returns {Promise<Array<ProtoFileType>>}
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
        protoFile.pbNamespace = exports.filePathToPbNamespace(protoFile.fileName);
        protoFile.pbSvcNamespace = exports.filePathToPbServiceNamespace(protoFile.fileName);
        return protoFile;
    }).filter((value) => {
        return value !== undefined;
    });
    return Promise.resolve(protoFiles);
});
/**
 * dummy/your.proto => ../
 * dummy/and/dummy/your.proto => ../../../
 * @param {string} filePath
 * @returns {string}
 */
exports.getPathToRoot = (filePath) => {
    const depth = filePath.replace(/\\/g, '/').split('/').length;
    return depth === 1 ? './' : new Array(depth).join('../');
};
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
 * @param {ProtoFileType} protoFile
 * @returns {string}
 */
exports.genFullProtoFilePath = (protoFile) => {
    return LibPath.join(protoFile.protoPath, protoFile.relativePath, protoFile.fileName);
};
/**
 * Generate full service stub code output path.
 * @param {ProtoFileType} protoFile
 * @param {Service} service
 * @param {Method} method
 * @returns {string}
 */
exports.genFullOutputServicePath = (protoFile, service, method) => {
    return LibPath.join(protoFile.outputPath, 'services', protoFile.relativePath, protoFile.pbSvcNamespace, service.name, Utility.lcFirst(method.name) + '.ts');
};
/**
 * Generate full service client stub code output path.
 * @param {ProtoFileType} protoFile
 * @param {Service} service
 * @returns {string}
 */
exports.genFullOutputServiceClientPath = (protoFile, service) => {
    return LibPath.join(protoFile.outputPath, 'clients', protoFile.relativePath, 'MS' + service.name + 'Client.ts');
};
/**
 * Generate message proto js file (e.g *_pb.js) import path.
 * Source code path is generated with {@link genFullOutputServicePath},
 * message proto js import path is relative to it.
 * @param {ProtoFileType} protoFile
 * @param {string} filePath
 * @param {string} dirName
 * @returns {string}
 */
exports.genProtoImportPath = (protoFile, filePath, dirName = 'services') => {
    return LibPath.join(exports.getPathToRoot(filePath.substr(filePath.indexOf(dirName))), 'proto', protoFile.relativePath, protoFile.pbNamespace).replace(/\\/g, '/');
};
/**
 * Generate service proto js file (e.g *_grpc_pb.js) import path.
 * Source code is "register.ts", service proto js import path is relative to it.
 * @param {ProtoFileType} protoFile
 * @param {string} filePath
 * @param {string} dirName
 * @returns {string}
 */
exports.genProtoServiceImportPath = (protoFile, filePath, dirName = 'services') => {
    return LibPath.join(exports.getPathToRoot(filePath.substr(filePath.indexOf(dirName))), 'proto', protoFile.relativePath, protoFile.pbSvcNamespace).replace(/\\/g, '/');
};
