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
const protobuf = require("protobufjs");
const Utility = require("./Utility");
const ProtoFile = require("./ProtoFile");
const PROTO_BUFFER_BASE_TYPE = [
    'double',
    'float',
    'int32',
    'int64',
    'uint32',
    'uint64',
    'sint32',
    'sint64',
    'fixed32',
    'fixed64',
    'sfixed32',
    'sfixed64',
    'bool',
    'string',
    'bytes'
];
/**
 * 读取 *.proto 文件生成 IParserResult 结构体
 *
 * @param {ProtoFileType} protoFile
 * @returns {IParserResult}
 */
exports.parseProto = (protoFile) => __awaiter(this, void 0, void 0, function* () {
    let content = yield LibFs.readFile(ProtoFile.genFullProtoFilePath(protoFile));
    return protobuf.parse(content.toString());
});
/**
 * 从 IParserResult 结构体中解析 import 的 package 相关数据
 *
 * @param {IParserResult} protoParser
 * @param {ProtoFileType} protoFile
 * @param {string} symlink
 * @returns {ProtoInfoMap}
 */
exports.parseProtoInfo = (protoParser, protoFile, symlink = '.') => __awaiter(this, void 0, void 0, function* () {
    const protoInfoMap = new Map();
    const pkgNamespace = protoParser.root.lookup(protoParser.package);
    Object.keys(pkgNamespace.nested).forEach((nestedKey) => {
        const reflectObj = pkgNamespace.lookup(nestedKey);
        let type;
        let service;
        if (reflectObj.hasOwnProperty('fields')) {
            // Means this ReflectionObject is typeof Type
            type = reflectObj;
        }
        else if (reflectObj.hasOwnProperty('methods')) {
            // Means this ReflectionObject is typeof Service
            service = reflectObj;
        }
        // packageName: 'user' + symlink: '.' + nestedKey: 'UserService' = 'user.UserService'
        protoInfoMap.set(pkgNamespace.name + symlink + nestedKey, {
            protoFile: protoFile,
            message: nestedKey,
            namespace: pkgNamespace.name,
            type: type,
            service: service
        });
    });
    return protoInfoMap;
});
/**
 * When handling proto to generate services files, it's necessary to know
 * the imported messages in third party codes.
 *
 * @param {ProtoFileType} protoFile
 * @param {Method} method
 * @param {string} outputPath
 * @param {ProtoInfoMap} protoImportMap
 * @param {string} dirName
 * @returns {RpcMethodInfo}
 */
exports.genRpcMethodInfo = (protoFile, method, outputPath, protoImportMap, dirName = 'services') => {
    let protoImportPath = ProtoFile.genProtoImportPath(protoFile, outputPath, dirName);
    let protoMsgImportPaths = {};
    let requestType = method.requestType;
    let requestTypeImportPath = protoImportPath;
    if (protoImportMap.has(requestType)) {
        let requestProtoInfo = protoImportMap.get(requestType);
        requestType = requestProtoInfo.message;
        requestTypeImportPath = ProtoFile.genProtoImportPath(requestProtoInfo.protoFile, outputPath, dirName);
    }
    protoMsgImportPaths = exports.addIntoRpcMethodImportPathInfos(protoMsgImportPaths, requestType, requestTypeImportPath);
    let responseType = method.responseType;
    let responseTypeImportPath = protoImportPath;
    if (protoImportMap.has(responseType)) {
        let responseProtoInfo = protoImportMap.get(responseType);
        responseType = responseProtoInfo.message;
        responseTypeImportPath = ProtoFile.genProtoImportPath(responseProtoInfo.protoFile, outputPath, dirName);
    }
    protoMsgImportPaths = exports.addIntoRpcMethodImportPathInfos(protoMsgImportPaths, responseType, responseTypeImportPath);
    return {
        callTypeStr: '',
        requestTypeStr: requestType,
        responseTypeStr: responseType,
        hasCallback: false,
        hasRequest: false,
        methodName: Utility.lcFirst(method.name),
        protoMsgImportPath: protoMsgImportPaths
    };
};
exports.addIntoRpcMethodImportPathInfos = (protoMsgImportPaths, type, importPath) => {
    if (!protoMsgImportPaths.hasOwnProperty(importPath)) {
        protoMsgImportPaths[importPath] = [];
    }
    protoMsgImportPaths[importPath].push(type);
    return protoMsgImportPaths;
};
