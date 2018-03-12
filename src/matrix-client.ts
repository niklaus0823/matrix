import * as program from 'commander';
import * as LibFs from 'fs-extra';
import * as LibPath from 'path';
import * as Utility from './lib/Utility';
import * as Proto from './lib/Proto';
import * as ProtoFile from './lib/ProtoFile';
import {RpcClientTpl} from './template/client';

const debug = require('debug')('matrix:client');
const pkg = require('../package.json');

// node ./build/matrix.js client -p ./examples/proto -o ./examples/output -i ./examples/proto_modules -e ./examples/proto_modules/google
program.version(pkg.version)
    .option('-p, --proto <dir>', 'directory of source proto files')
    .option('-o, --output <dir>', 'directory to output codes')
    .option('-i, --import <items>', 'third party proto import path: e.g path1,path2,path3', (val) => val.split(','))
    .option('-e, --exclude <items>', 'files or paths in -p shall be excluded: e.g file1,path1,path2,file2', (val) => val.split(','))
    .parse(process.argv);

const PROTO_DIR = (program as any).proto === undefined ? undefined : Utility.getAbsolutePath((program as any).proto);
const OUTPUT_DIR = (program as any).output === undefined ? undefined : Utility.getAbsolutePath((program as any).output);
const EXCLUDES: Array<string> = (program as any).exclude === undefined ? [] : (program as any).exclude;
const IMPORTS: Array<string> = (program as any).import === undefined ? [] : (program as any).import;

class CLI {

    private _protoFiles: Array<ProtoFile.ProtoFileType> = [];
    private _protoImportMap: Proto.ProtoInfoMap = new Map();

    static instance() {
        return new CLI();
    }

    public async run() {
        debug('CLI start.');

        await this._validate();
        await this._loadProtoFile();
        await this._genServiceCode();

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
    }

    private async _loadProtoFile() {
        this._protoFiles = this._protoFiles.concat(await ProtoFile.readProtoFiles(PROTO_DIR, OUTPUT_DIR, EXCLUDES));
        if (IMPORTS.length > 0) {
            for (let i = 0; i < IMPORTS.length; i++) {
                this._protoFiles = this._protoFiles.concat(await ProtoFile.readProtoFiles(Utility.getAbsolutePath(IMPORTS[i]), OUTPUT_DIR, EXCLUDES));
            }
        }
    }

    private async _genServiceCode() {
        if (this._protoFiles.length === 0) {
            throw new Error('no proto files found');
        }

        // 创建 client 默认文件夹
        let clientPath = LibPath.join(OUTPUT_DIR, 'clients');
        if (!LibFs.existsSync(clientPath)) {
            await LibFs.mkdir(clientPath);
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

        let servicesInfos = [] as Array<ProtoFile.ProtoServices>;
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
                pbImportPath: '',
                pbSvcImportPath: '',
                services: {},
                serviceMethods: {}
            };

            // generate method code via protoInfo
            proto.protoInfoMap.forEach((protoInfo: Proto.ProtoInfo) => {
                if (!protoInfo.service) {
                    return;
                }

                // add proto service
                let service: protobuf.Service = protoInfo.service;
                serviceInfo.services[service.name] = service;
                serviceInfo.serviceMethods[service.name] = {};

                // loop proto service method and generate method code
                Object.keys(protoInfo.service.methods).forEach((methodName: string) => {
                    if (!service.methods.hasOwnProperty(methodName)) {
                        return;
                    }

                    // add proto service method
                    serviceInfo.serviceMethods[service.name][Utility.lcFirst(methodName)] = service.methods[methodName];
                });
            });

            servicesInfos.push(serviceInfo);
        });

        if (servicesInfos.length === 0) {
            throw new Error('no service files need export');
        }

        servicesInfos.forEach((serviceInfo: ProtoFile.ProtoServices) => {
            Object.keys(serviceInfo.services).forEach((serviceName: string) => {
                this._genServiceClientCode(serviceName, serviceInfo);
            });
        });
    }

    private _genServiceClientCode(serviceName: string, serviceInfo: ProtoFile.ProtoServices): void {
        debug(`Generate service client: ${serviceName}`);

        let service = serviceInfo.services[serviceName];
        let serviceMethods = serviceInfo.serviceMethods[serviceName];

        // parse proto service method info
        let outputPath = ProtoFile.genFullOutputServiceClientPath(serviceInfo.protoFile, service);

        serviceInfo.pbImportPath = ProtoFile.genProtoImportPath(serviceInfo.protoFile, outputPath, 'client');
        serviceInfo.pbSvcImportPath = ProtoFile.genProtoServiceImportPath(serviceInfo.protoFile, outputPath, 'client');

        let methodInfos = [] as Array<Proto.RpcMethodInfo>;
        Object.keys(serviceMethods).forEach((methodName: string) => {
            let method = serviceMethods[methodName];
            let methodInfo = Proto.genRpcMethodInfo(serviceInfo.protoFile, method, outputPath, this._protoImportMap, 'client');
            if (!method.requestStream && !method.responseStream) {
                methodInfo.callTypeStr = 'IRpcServerUnaryCall';
            } else if (!method.requestStream && method.responseStream) {
                methodInfo.callTypeStr = 'IRpcServerWriteableStream';
            } else if (method.requestStream && !method.responseStream) {
                methodInfo.callTypeStr = 'IRpcServerCallback';
            } else if (method.requestStream && method.responseStream) {
                methodInfo.callTypeStr = 'IRpcServerDuplexStream';
            }
            methodInfos.push(methodInfo);
        });

        let outputDir = LibPath.dirname(outputPath);
        if (!LibFs.existsSync(outputDir)) {
            LibFs.mkdirsSync(outputDir);
        }

        LibFs.writeFileSync(outputPath, RpcClientTpl.print(serviceName, serviceInfo, methodInfos));
    }
}

CLI.instance().run().catch((err: Error) => {
    console.log('err: ', err.message);
});