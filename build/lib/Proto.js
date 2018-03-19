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
exports.PROTO_BUFFER_BASE_TYPE = [
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
const METHOD_OPTIONS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
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
    let options = null;
    if (method.options !== undefined) {
        Object.keys(method.options).forEach((option) => {
            if (option.indexOf('(google.api.http).') !== 0) {
                return;
            }
            let optionName = option.replace('(google.api.http).', '');
            if (METHOD_OPTIONS.indexOf(optionName) != -1) {
                options = {
                    method: optionName,
                    uri: method.options[option]
                };
                return;
            }
        });
    }
    return {
        namespace: method.parent.parent.name,
        callTypeStr: '',
        requestTypeStr: requestType,
        responseTypeStr: responseType,
        hasCallback: false,
        hasRequest: false,
        methodName: Utility.lcFirst(method.name),
        protoMsgImportPath: protoMsgImportPaths,
        options: options
    };
};
/**
 * When handling proto to generate services files, it's necessary to know
 * the imported messages in third party codes.
 *
 * @param {string} typeName
 * @param {ProtoMessageTypeMap} messageTypeMap
 * @param {number} maxLevel
 * @param {number} level
 * @returns {Object}
 */
exports.genRpcMethodFieldInfo = (typeName, messageTypeMap, maxLevel = 5, level = 1) => {
    let type = messageTypeMap.get(typeName);
    if (type == undefined) {
        return {};
    }
    let fieldInfos = {};
    Object.keys(type.fields).forEach((name) => {
        let field = type.fields[name];
        let fieldType = field.type;
        let fieldInfo;
        let isMap = false;
        if (field.hasOwnProperty('keyType') === true) {
            isMap = true;
        }
        if (exports.PROTO_BUFFER_BASE_TYPE.indexOf(field.type) < 0) {
            if (messageTypeMap.get(field.type)) {
                if (level < maxLevel) {
                    fieldType = field.type;
                    fieldInfo = exports.genRpcMethodFieldInfo(field.type, messageTypeMap, maxLevel, level + 1);
                }
                else {
                    fieldType = 'object';
                }
            }
            else {
                fieldType = 'any';
            }
        }
        let fieldComment;
        try {
            fieldComment = JSON.parse(field.comment);
        }
        catch (e) {
            fieldComment = null;
        }
        fieldInfos[field.name] = {
            fieldType: fieldType,
            fieldName: field.name,
            fieldComment: fieldComment,
            fieldInfo: fieldInfo,
            isRepeated: field.repeated,
            isMap: isMap,
        };
    });
    return fieldInfos;
};
exports.addIntoRpcMethodImportPathInfos = (protoMsgImportPaths, type, importPath) => {
    if (!protoMsgImportPaths.hasOwnProperty(importPath)) {
        protoMsgImportPaths[importPath] = [];
    }
    protoMsgImportPaths[importPath].push(type);
    return protoMsgImportPaths;
};
