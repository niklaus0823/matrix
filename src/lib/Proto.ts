import * as LibFs from 'fs-extra';
import * as protobuf from 'protobufjs';
import * as Utility from './Utility';
import * as ProtoFile from './ProtoFile';
import {IParserResult} from 'protobufjs';

export const PROTO_BUFFER_BASE_TYPE = [
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

export interface ProtoType {
    protoParser: protobuf.IParserResult;
    protoFile: ProtoFile.ProtoFileType;
    protoInfoMap: ProtoInfoMap;
}

export interface ProtoInfo {
    protoFile: ProtoFile.ProtoFileType;
    message: string;
    namespace: string;
    type?: protobuf.Type;
    service?: protobuf.Service;
}

export type ProtoInfoMap = Map<string, ProtoInfo>;
export type ProtoMessageTypeMap = Map<string, protobuf.Type>;

export interface FieldInfo {
    fieldName: string;
    fieldType: string;
    fieldComment?: fieldComment;
    fieldInfo?: FieldInfoMap;
    isRepeated: boolean;
    isMap: boolean;
}

interface fieldComment {
    required?: boolean;
    regex?: string;
    defaultValue?: any;
    enumOption?: Array<string | number>;
    numberMin?: number;
    numberMax?: number;
    stringLengthMin?: number;
    stringLengthMax?: number;
    booleanTruthy?: Array<string | number | boolean>;
    booleanFalsy?: Array<string | number | boolean>;
}

export type FieldInfoMap = {[fieldName: string]: FieldInfo};

export interface RpcMethodInfo {
    namespace: string;
    callTypeStr: string;
    callGenerics: string;
    requestTypeStr: string;
    responseTypeStr: string;
    hasCallback: boolean;
    hasRequest: boolean;
    methodName: string;
    protoMsgImportPath: RpcMethodImportPathInfos;
    options?: RpcMethodOptions
}

export interface RpcMethodOptions {
    method: string;
    uri: string;
}

/**
 * Used: Command rpcs, generating services stubs.
 * When handling proto to generate services files, it's necessary to know
 * the imported messages in third party codes.
 *
 * e.g
 * {
 *   // imported third party code files: [ imported third party messages ]
 *   '../../proto/user_pb': [ 'User', 'GetUserRequest' ]
 * }
 */
export interface RpcMethodImportPathInfos {
    [importPath: string]: Array<string>;
}

/**
 * 读取 *.proto 文件生成 IParserResult 结构体
 *
 * @param {ProtoFileType} protoFile
 * @returns {IParserResult}
 */
export const parseProto = async (protoFile: ProtoFile.ProtoFileType): Promise<protobuf.IParserResult> => {
    let content = await LibFs.readFile(ProtoFile.genFullProtoFilePath(protoFile));
    return protobuf.parse(content.toString());
};

/**
 * 从 IParserResult 结构体中解析 import 的 package 相关数据
 *
 * @param {IParserResult} protoParser
 * @param {ProtoFileType} protoFile
 * @param {string} symlink
 * @returns {ProtoInfoMap}
 */
export const parseProtoInfo = async (protoParser: protobuf.IParserResult, protoFile: ProtoFile.ProtoFileType, symlink: string = '.'): Promise<ProtoInfoMap> => {
    const protoInfoMap: ProtoInfoMap = new Map();

    const pkgNamespace = protoParser.root.lookup(protoParser.package) as protobuf.Namespace;
    Object.keys(pkgNamespace.nested).forEach((nestedKey) => {
        const reflectObj: protobuf.ReflectionObject = pkgNamespace.lookup(nestedKey);

        let type: protobuf.Type;
        let service: protobuf.Service;
        if (reflectObj.hasOwnProperty('fields')) {
            // Means this ReflectionObject is typeof Type
            type = reflectObj as protobuf.Type;
        } else if (reflectObj.hasOwnProperty('methods')) {
            // Means this ReflectionObject is typeof Service
            service = reflectObj as protobuf.Service;
        }

        // packageName: 'user' + symlink: '.' + nestedKey: 'UserService' = 'user.UserService'
        protoInfoMap.set(pkgNamespace.name + symlink + nestedKey, {
            protoFile: protoFile,
            message: nestedKey,
            namespace: pkgNamespace.name,
            type: type,
            service: service
        } as ProtoInfo);

    });

    return protoInfoMap;
};

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
export const genRpcMethodInfo = (protoFile: ProtoFile.ProtoFileType, method: protobuf.Method, outputPath: string, protoImportMap: ProtoInfoMap, dirName: string = 'services'): RpcMethodInfo => {
    let protoImportPath = ProtoFile.genProtoImportPath(protoFile, outputPath, dirName);
    let protoMsgImportPaths = {} as RpcMethodImportPathInfos;


    let requestType = method.requestType;
    let requestTypeImportPath = protoImportPath;
    if (protoImportMap.has(requestType)) {
        let requestProtoInfo: ProtoInfo = protoImportMap.get(requestType);
        requestType = requestProtoInfo.message;
        requestTypeImportPath = ProtoFile.genProtoImportPath(requestProtoInfo.protoFile, outputPath, dirName);
    }
    protoMsgImportPaths = addIntoRpcMethodImportPathInfos(protoMsgImportPaths, requestType, requestTypeImportPath);

    let responseType = method.responseType;
    let responseTypeImportPath = protoImportPath;
    if (protoImportMap.has(responseType)) {
        let responseProtoInfo: ProtoInfo = protoImportMap.get(responseType);
        responseType = responseProtoInfo.message;
        responseTypeImportPath = ProtoFile.genProtoImportPath(responseProtoInfo.protoFile, outputPath, dirName);
    }
    protoMsgImportPaths = addIntoRpcMethodImportPathInfos(protoMsgImportPaths, responseType, responseTypeImportPath);

    let options: RpcMethodOptions = null;
    if (method.options !== undefined) {
        Object.keys(method.options).forEach((option: string) => {
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
    } as RpcMethodInfo;
};

/**
 * When handling proto to generate services files, it's necessary to know
 * the imported messages in third party codes.
 *
 * @param {string} typeName
 * @param {ProtoMessageTypeMap} messageTypeMap
 * @param {ProtoInfoMap} protoImportMap
 * @param {string} outputPath
 * @param {RpcMethodInfo} methodInfo
 * @param {number} maxLevel
 * @param {number} level
 * @param {string} dirName
 * @returns {Object}
 */
export const genRpcMethodFieldInfo = (typeName: string, messageTypeMap: ProtoMessageTypeMap, protoImportMap: ProtoInfoMap, outputPath: string, methodInfo: RpcMethodInfo, maxLevel: number = 5, level: number = 1, dirName: string = 'services'): FieldInfoMap => {
    let type: protobuf.Type = messageTypeMap.get(typeName);
    if (type == undefined) {
        return {};
    }

    let fieldInfos: FieldInfoMap = {};
    Object.keys(type.fields).forEach((name) => {
        let field = type.fields[name];
        let fieldType = field.type;
        let fieldInfo: FieldInfoMap;
        let isMap = false;

        if (field.hasOwnProperty('keyType') === true) {
            isMap = true;
        }

        if (PROTO_BUFFER_BASE_TYPE.indexOf(field.type) < 0) {
            // pb type will have two schema: 'user.User' or 'User'
            fieldType = (field.type.indexOf('.') < 0) ? type.parent.name + '.' + field.type : field.type;
            if (messageTypeMap.has(fieldType)) {
                if (level < maxLevel) {
                    fieldInfo = genRpcMethodFieldInfo(fieldType, messageTypeMap, protoImportMap, outputPath, methodInfo, maxLevel, level + 1, dirName);
                    let fieldProtoInfo: ProtoInfo = protoImportMap.get(fieldType);
                    if (fieldProtoInfo !== undefined) {
                        methodInfo.protoMsgImportPath = addIntoRpcMethodImportPathInfos(
                            methodInfo.protoMsgImportPath,
                            fieldProtoInfo.message,
                            ProtoFile.genProtoImportPath(fieldProtoInfo.protoFile, outputPath, dirName)
                        );
                    }
                } else {
                    fieldType = 'object';
                }
            } else {
                fieldType = 'any';
            }
        }

        let fieldComment;
        try {
            fieldComment = JSON.parse(field.comment);
        } catch (e) {
            fieldComment = null;
        }

        fieldInfos[field.name] = {
            fieldType: fieldType,
            fieldName: field.name,
            fieldComment: fieldComment,
            fieldInfo: fieldInfo,
            isRepeated: field.repeated,
            isMap: isMap,
        } as FieldInfo;
    });

    return fieldInfos;
};

export const addIntoRpcMethodImportPathInfos = (protoMsgImportPaths: RpcMethodImportPathInfos, type: string, importPath: string): RpcMethodImportPathInfos => {
    if (!protoMsgImportPaths.hasOwnProperty(importPath)) {
        protoMsgImportPaths[importPath] = [];
    }
    if (protoMsgImportPaths[importPath].indexOf(type) < 0) {
        protoMsgImportPaths[importPath].push(type);
    }
    return protoMsgImportPaths;
};