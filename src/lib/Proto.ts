import * as LibFs from 'fs-extra';
import * as protobuf from 'protobufjs';
import * as Utility from './Utility';
import * as ProtoFile from './ProtoFile';
import {IParserResult} from 'protobufjs';

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

export interface FieldInfo {
    fieldName: string;
    fieldType: string;
    fieldComment: object | string;
    isRepeated: boolean;
    fieldInfo?: Array<FieldInfo> | string;
}

export interface MethodInfo {
    methodName: string;
    requestType: string;
    requestStream: boolean;
    responseType: string;
    responseStream: boolean;
}

export interface RpcProtoServicesInfo {
    protoFile: ProtoFile.ProtoFileType;
    protoServiceImportPath: string;
    services: {
        [serviceName: string]: Array<RpcMethodInfo>;
    };
}

export interface RpcMethodInfo {
    callTypeStr: string;
    callGenerics: string;
    requestTypeStr: string;
    responseTypeStr: string;
    hasCallback: boolean;
    hasRequest: boolean;
    methodName: string;
    protoMsgImportPath: RpcMethodImportPathInfos;
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
 * @returns {RpcMethodInfo}
 */
export const genRpcMethodInfo = (protoFile: ProtoFile.ProtoFileType, method: protobuf.Method, outputPath: string, protoImportMap: ProtoInfoMap): RpcMethodInfo => {
    let protoImportPath = ProtoFile.genProtoImportPath(protoFile, outputPath);
    let protoMsgImportPaths = {} as RpcMethodImportPathInfos;

    let requestType = method.requestType;
    let requestTypeImportPath = protoImportPath;
    if (protoImportMap.has(requestType)) {
        let requestProtoInfo: ProtoInfo = protoImportMap.get(requestType);
        requestType = requestProtoInfo.message;
        requestTypeImportPath = ProtoFile.genProtoImportPath(requestProtoInfo.protoFile, outputPath);
    }
    protoMsgImportPaths = addIntoRpcMethodImportPathInfos(protoMsgImportPaths, requestType, requestTypeImportPath);

    let responseType = method.responseType;
    let responseTypeImportPath = protoImportPath;
    if (protoImportMap.has(responseType)) {
        let responseProtoInfo: ProtoInfo = protoImportMap.get(responseType);
        responseType = responseProtoInfo.message;
        responseTypeImportPath = ProtoFile.genProtoImportPath(responseProtoInfo.protoFile, outputPath);
    }
    protoMsgImportPaths = addIntoRpcMethodImportPathInfos(protoMsgImportPaths, responseType, responseTypeImportPath);

    return {
        callTypeStr: '',
        requestTypeStr: requestType,
        responseTypeStr: responseType,
        hasCallback: false,
        hasRequest: false,
        methodName: Utility.lcFirst(method.name),
        protoMsgImportPath: protoMsgImportPaths
    } as RpcMethodInfo;
};

export const addIntoRpcMethodImportPathInfos = (protoMsgImportPaths: RpcMethodImportPathInfos, type: string, importPath: string): RpcMethodImportPathInfos => {
    if (!protoMsgImportPaths.hasOwnProperty(importPath)) {
        protoMsgImportPaths[importPath] = [];
    }
    protoMsgImportPaths[importPath].push(type);
    return protoMsgImportPaths;
};