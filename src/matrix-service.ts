import * as program from 'commander';
import * as LibFs from 'fs-extra';
import * as LibPath from 'path';
import * as Utility from './lib/Utility';
import * as Proto from './lib/Proto';
import * as ProtoFile from './lib/ProtoFile';
import {ServiceHandler} from './template/service/ServiceHandler';
import {ServiceRegister} from './template/service/ServiceRegister';

const debug = require('debug')('matrix:service');
const pkg = require('../package.json');

// node ./build/matrix.js service -p ./examples/proto -o ./examples/output -i ./examples/proto_modules -e ./examples/proto_modules/google
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

        // 创建 services 默认文件夹
        let servicePath = LibPath.join(OUTPUT_DIR, 'services');
        if (!LibFs.existsSync(servicePath)) {
            await LibFs.mkdir(servicePath);
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

        // Service Register 模板结构
        let servicesInfos = [] as Array<ProtoFile.ProtoServices>;

        // 遍历 protoInfoMap 更新
        protos.forEach((proto: Proto.ProtoType) => {
            if (proto.protoInfoMap.size == 0) {
                return;
            }

            // handle excludes
            let filePath = LibPath.join(proto.protoFile.protoPath, proto.protoFile.relativePath, proto.protoFile.fileName);
            let shallIgnore = Utility.shallIgnore(filePath, EXCLUDES);
            if (shallIgnore) {
                return;
            }

            let service: ProtoFile.ProtoServices = {
                protoFile: proto.protoFile,
                protoServiceImportPath: ProtoFile.genProtoServiceImportPath(proto.protoFile),
                protoService: {}
            };

            proto.protoInfoMap.forEach((protoInfo: Proto.ProtoInfo) => {
                if (!protoInfo.service) {
                    return;
                }
                service.protoService[protoInfo.service.name] = [];
                Object.keys(protoInfo.service.methods).forEach((methodName: string) => {
                    service.protoService[protoInfo.service.name].push(Utility.lcFirst(methodName));
                    this._genServiceMethodCode(protoInfo, protoInfo.service.methods[methodName]);
                });
            });

            servicesInfos.push(service);
        });

        if (servicesInfos.length === 0) {
            throw new Error('no service files need export');
        }

        let outputPath = LibPath.join(OUTPUT_DIR, 'services', 'Register.ts');
        LibFs.writeFileSync(outputPath, ServiceRegister.print(servicesInfos));
    }

    private _genServiceMethodCode(protoInfo: Proto.ProtoInfo, method: protobuf.Method): void {
        debug(`Generate service method: ${protoInfo.service.name}.${method.name}`);

        let outputPath = ProtoFile.genFullOutputServicePath(protoInfo.protoFile, protoInfo.service, method);
        let methodInfo = Proto.genRpcMethodInfo(protoInfo.protoFile, method, outputPath, this._protoImportMap);

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
            methodInfo.callTypeStr = 'IRpcServerCallback';
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

        LibFs.writeFileSync(outputPath, ServiceHandler.print(methodInfo));
    }
}

CLI.instance().run().catch((err: Error) => {
    console.log('err: ', err.message);
});