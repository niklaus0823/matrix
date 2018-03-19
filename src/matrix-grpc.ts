import * as program from 'commander';
import * as LibFs from 'fs-extra';
import * as LibPath from 'path';
import * as Utility from './lib/Utility';
import * as Proto from './lib/Proto';
import * as ProtoFile from './lib/ProtoFile';
import {TplRpcClient} from './template/client/client';
import {TplRpcServerService} from './template/server/service';
import {TplRpcServerServiceRegister} from './template/server/register';
import {TplGatewayRouter} from './template/gateway/router';
import {TplGatewayApi} from './template/gateway/api';

const debug = require('debug')('matrix:service');
const pkg = require('../package.json');

// tsc && node ./build/matrix.js grpc -p ./examples/proto -o ./examples/output -i ./examples/proto_modules -e ./examples/proto_modules/google,./examples/proto_modules/kafka,./examples/proto_modules/memcached -c -s -g
program.version(pkg.version)
    .option('-p, --proto <dir>', 'directory of source proto files')
    .option('-o, --output <dir>', 'directory to output codes')
    .option('-i, --import <items>', 'third party proto import path: e.g path1,path2,path3', (val) => val.split(','))
    .option('-e, --exclude <items>', 'files or paths in -p shall be excluded: e.g file1,path1,path2,file2', (val) => val.split(','))
    .option('-c, --client', 'add -c to output grpc client source codes')
    .option('-s, --server', 'add -s to output grpc server source codes')
    .option('-g, --gateway', 'add -g to output gateway api source codes')
    .option('-d, --deepSearchLevel <number>', 'add -d to parse swagger definition depth, default: 5')
    .parse(process.argv);

const PROTO_DIR = (program as any).proto === undefined ? undefined : Utility.getAbsolutePath((program as any).proto);
const OUTPUT_DIR = (program as any).output === undefined ? undefined : Utility.getAbsolutePath((program as any).output);
const EXCLUDES: Array<string> = (program as any).exclude === undefined ? [] : (program as any).exclude;
const IMPORTS: Array<string> = (program as any).import === undefined ? [] : (program as any).import;
const IS_OUTPUT_CLIENT = (program as any).client !== undefined;
const IS_OUTPUT_SERVER = (program as any).server !== undefined;
const IS_OUTPUT_GATEWAY = (program as any).gateway !== undefined;
const DEEP_SEARCH_LEVEL = (program as any).deepSearchLevel === undefined ? 5 : (program as any).deepSearchLevel;

class CLI {

    private _protoFiles: Array<ProtoFile.ProtoFileType> = [];
    private _protoImportMap: Proto.ProtoInfoMap = new Map();
    private _protoMessageTypeMap: Proto.ProtoMessageTypeMap = new Map();

    static instance() {
        return new CLI();
    }

    public async run() {
        debug('CLI start.');

        await this._validate();
        await this._loadProtoFile();
        await this._genCode();

        debug('CLI run over.');
    }

    private async _validate() {
        if (!PROTO_DIR) {
            throw new Error('--proto is required');
        }

        if (!OUTPUT_DIR) {
            throw new Error('--output is required');
        }

        if (!await LibFs.pathExists(PROTO_DIR)) {
            throw new Error('--proto is not exist');
        }

        if (!await LibFs.pathExists(OUTPUT_DIR)) {
            throw new Error('--output is not exist');
        }

        let protoStat = await LibFs.stat(PROTO_DIR);
        if (!protoStat.isDirectory()) {
            throw new Error('--proto is not a directory');
        }

        let outputStat = await LibFs.stat(OUTPUT_DIR);
        if (!outputStat.isDirectory()) {
            throw new Error('--output is not a directory');
        }

        if (!IS_OUTPUT_CLIENT && !IS_OUTPUT_SERVER && !IS_OUTPUT_GATEWAY) {
            throw new Error('Choose one of --client | --server | --gateway to output');
        }
    }

    private async _loadProtoFile() {
        this._protoFiles = this._protoFiles.concat(await ProtoFile.readProtoFiles(PROTO_DIR, OUTPUT_DIR, EXCLUDES));
        if (IMPORTS.length > 0) {
            for (let i = 0; i < IMPORTS.length; i++) {
                this._protoFiles = this._protoFiles.concat(await ProtoFile.readProtoFiles(Utility.getAbsolutePath(IMPORTS[i]), OUTPUT_DIR, EXCLUDES));
            }
        }
    }

    private async _genCode() {
        if (this._protoFiles.length === 0) {
            throw new Error('no proto files found');
        }

        // 通过 protoFile 获取 proto 结构，并保存所有 proto 的 importName 以及相关信息，已被后面计算 import 相关信息
        const protos = await Promise.all(this._protoFiles.map(async (protoFile: ProtoFile.ProtoFileType): Promise<Proto.ProtoType> => {
            const protoParser = await Proto.parseProto(protoFile);
            const protoInfoMap = await Proto.parseProtoInfo(protoParser, protoFile);
            protoInfoMap.forEach((protoInfo: Proto.ProtoInfo, importName: string) => {
                this._protoImportMap.set(importName, protoInfo);
            });

            return {
                protoParser: protoParser,
                protoFile: protoFile,
                protoInfoMap: protoInfoMap,
            } as Proto.ProtoType;
        }));

        // 遍历 protoType 的 service 和 serviceMethod，并计算出需要的 Array<ProtoFile.ProtoServices> 结构
        let serviceInfos = [] as Array<ProtoFile.ProtoServices>;
        protos.forEach((proto: Proto.ProtoType) => {
            if (proto.protoInfoMap.size == 0) {
                return;
            }

            // process excludes file
            let filePath = LibPath.join(proto.protoFile.protoPath, proto.protoFile.relativePath, proto.protoFile.fileName);
            let shallIgnore = Utility.shallIgnore(filePath, EXCLUDES);
            if (shallIgnore) {
                return;
            }

            // generate service info via protoFile
            let serviceInfo: ProtoFile.ProtoServices = {
                protoFile: proto.protoFile,
                pbImportPath: ProtoFile.genProtoImportPath(proto.protoFile, OUTPUT_DIR),
                pbSvcImportPath: ProtoFile.genProtoServiceImportPath(proto.protoFile, OUTPUT_DIR),
                services: {},
                serviceMethods: {},
                gatewayMethods: {}
            };

            // generate method via protoInfo
            proto.protoInfoMap.forEach((protoInfo: Proto.ProtoInfo) => {
                if (!protoInfo.service) {
                    // merge proto message type
                    if (protoInfo.type !== undefined) {
                        this._protoMessageTypeMap.set(`${protoInfo.namespace}.${protoInfo.type.name}`, protoInfo.type);
                    }

                    return;
                }

                // add proto service
                let service: protobuf.Service = protoInfo.service;
                serviceInfo.services[service.name] = service;

                // loop proto service method and generate method code
                Object.keys(protoInfo.service.methods).forEach((methodName: string) => {
                    if (!service.methods.hasOwnProperty(methodName)) {
                        return;
                    }
                    let method = service.methods[methodName];
                    if (method.options === undefined) {
                        if (!serviceInfo.serviceMethods.hasOwnProperty(service.name)) {
                            serviceInfo.serviceMethods[service.name] = {};
                        }
                        serviceInfo.serviceMethods[service.name][Utility.lcFirst(methodName)] = method;
                    } else {
                        if (!serviceInfo.gatewayMethods.hasOwnProperty(service.name)) {
                            serviceInfo.gatewayMethods[service.name] = {};
                        }
                        serviceInfo.gatewayMethods[service.name][Utility.lcFirst(methodName)] = method;
                    }
                });
            });

            serviceInfos.push(serviceInfo);
        });

        if (serviceInfos.length === 0) {
            throw new Error('no service files need export');
        }

        if (IS_OUTPUT_SERVER || IS_OUTPUT_CLIENT || IS_OUTPUT_GATEWAY) {
            serviceInfos.forEach((serviceInfo: ProtoFile.ProtoServices) => {
                Object.keys(serviceInfo.services).forEach((serviceName: string) => {
                    let service = serviceInfo.services[serviceName];

                    if (serviceInfo.serviceMethods.hasOwnProperty(serviceName)) {
                        let serviceMethods = serviceInfo.serviceMethods[serviceName];

                        if (IS_OUTPUT_SERVER) {
                            this._genRpcServerServiceCode(service, serviceMethods, serviceInfo.protoFile);
                        }

                        if (IS_OUTPUT_CLIENT) {
                            this._genRpcClientCode(service, serviceMethods, serviceInfo.protoFile);
                        }
                    }

                    if (serviceInfo.gatewayMethods.hasOwnProperty(serviceName)) {
                        let gatewayMethods = serviceInfo.gatewayMethods[serviceName];

                        if (IS_OUTPUT_GATEWAY) {
                            this._genApiGatewayApiCode(service, gatewayMethods, serviceInfo.protoFile);
                        }
                    }
                });
            });
        }

        if (IS_OUTPUT_SERVER) {
            // 创建 services 默认文件夹
            let outputPath = LibPath.join(OUTPUT_DIR, 'services', 'Register.ts');
            let outputDir = LibPath.dirname(outputPath);
            if (!LibFs.existsSync(outputDir)) {
                await LibFs.mkdir(outputDir);
            }
            LibFs.writeFileSync(outputPath, TplRpcServerServiceRegister.print(serviceInfos));
        }

        if (IS_OUTPUT_GATEWAY) {
            // 创建 router 默认文件夹
            let outputPath = LibPath.join(OUTPUT_DIR, 'router', 'Router.ts');
            let outputDir = LibPath.dirname(outputPath);
            if (!LibFs.existsSync(outputDir)) {
                await LibFs.mkdir(outputDir);
            }
            LibFs.writeFileSync(outputPath, TplGatewayRouter.print(serviceInfos));
        }
    }

    private _genRpcServerServiceCode(service: protobuf.Service, serviceMethods: {[serviceMethod: string]: protobuf.Method}, protoFile: ProtoFile.ProtoFileType): void {

        Object.keys(serviceMethods).forEach((methodName) => {
            debug(`Generate rpc server method: ${service.name}.${methodName}`);

            let method = serviceMethods[methodName];
            let outputPath = ProtoFile.genFullOutputServicePath(protoFile, service, method);
            let methodInfo = Proto.genRpcMethodInfo(protoFile, method, outputPath, this._protoImportMap);
            let methodFieldInfo = Proto.genRpcMethodFieldInfo(`${methodInfo.namespace}.${methodInfo.requestTypeStr}`, this._protoMessageTypeMap, DEEP_SEARCH_LEVEL);

            if (!method.requestStream && !method.responseStream) {
                methodInfo.callTypeStr = 'IRpcServerUnaryCall';
                methodInfo.callGenerics = `<${methodInfo.requestTypeStr}>`;
                methodInfo.hasCallback = true;
                methodInfo.hasRequest = true;
            } else if (!method.requestStream && method.responseStream) {
                methodInfo.callTypeStr = 'IRpcServerWriteableStream';
                methodInfo.callGenerics = `<${methodInfo.requestTypeStr}>`;
                methodInfo.hasRequest = true;
            } else if (method.requestStream && !method.responseStream) {
                methodInfo.callTypeStr = 'IRpcServerReadableStream';
                methodInfo.callGenerics = `<${methodInfo.requestTypeStr}>`;
                methodInfo.hasCallback = true;
            } else if (method.requestStream && method.responseStream) {
                methodInfo.callTypeStr = 'IRpcServerDuplexStream';
                methodInfo.callGenerics = `<${methodInfo.requestTypeStr}, ${methodInfo.responseTypeStr}>`;
            }

            let outputDir = LibPath.dirname(outputPath);
            if (!LibFs.existsSync(outputDir)) {
                LibFs.mkdirsSync(outputDir);
            }
            LibFs.writeFileSync(outputPath, TplRpcServerService.print(methodInfo, methodFieldInfo));
        });

    }

    private _genRpcClientCode(service: protobuf.Service, serviceMethods: {[serviceMethod: string]: protobuf.Method}, protoFile: ProtoFile.ProtoFileType): void {
        let methodNames = Object.keys(serviceMethods);
        if (methodNames.length == 0) {
            return;
        }

        debug(`Generate rpc client: ${service.name}`);

        // parse proto service method info
        let outputPath = ProtoFile.genFullOutputServiceClientPath(protoFile, service);
        let methodInfos = [] as Array<Proto.RpcMethodInfo>;
        methodNames.forEach((methodName: string) => {
            let method = serviceMethods[methodName];
            if (method.options !== undefined) {
                return;
            }

            let methodInfo = Proto.genRpcMethodInfo(protoFile, method, outputPath, this._protoImportMap, 'client');
            if (!method.requestStream && !method.responseStream) {
                methodInfo.callTypeStr = 'IRpcServerUnaryCall';
            } else if (!method.requestStream && method.responseStream) {
                methodInfo.callTypeStr = 'IRpcServerWriteableStream';
            } else if (method.requestStream && !method.responseStream) {
                methodInfo.callTypeStr = 'IRpcServerReadableStream';
            } else if (method.requestStream && method.responseStream) {
                methodInfo.callTypeStr = 'IRpcServerDuplexStream';
            }
            methodInfos.push(methodInfo);
        });

        let outputDir = LibPath.dirname(outputPath);
        if (!LibFs.existsSync(outputDir)) {
            LibFs.mkdirsSync(outputDir);
        }

        LibFs.writeFileSync(outputPath, TplRpcClient.print(service, methodInfos, ProtoFile.genProtoServiceImportPath(protoFile, outputPath, 'client')));
    }

    private _genApiGatewayApiCode(service: protobuf.Service, gatewayMethods: {[serviceMethod: string]: protobuf.Method}, protoFile: ProtoFile.ProtoFileType): void {
        Object.keys(gatewayMethods).forEach((methodName) => {
            let method = gatewayMethods[methodName];
            if (method.options === undefined) {
                return;
            }

            debug(`Generate gateway api method: ${service.name}.${methodName}`);
            let outputPath = ProtoFile.genFullOutputGatewayPath(protoFile, service, method);
            let methodInfo = Proto.genRpcMethodInfo(protoFile, method, outputPath, this._protoImportMap, 'router');
            let methodFieldInfo = Proto.genRpcMethodFieldInfo(`${methodInfo.namespace}.${methodInfo.requestTypeStr}`, this._protoMessageTypeMap, DEEP_SEARCH_LEVEL);

            let outputDir = LibPath.dirname(outputPath);
            if (!LibFs.existsSync(outputDir)) {
                LibFs.mkdirsSync(outputDir);
            }
            LibFs.writeFileSync(outputPath, TplGatewayApi.print(methodInfo, methodFieldInfo));
        });
    }
}

CLI.instance().run().catch((err: Error) => {
    console.log('err: ', err.message);
});