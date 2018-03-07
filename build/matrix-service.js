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
const program = require("commander");
const LibFs = require("fs-extra");
const LibPath = require("path");
const Utility = require("./lib/Utility");
const Proto = require("./lib/Proto");
const ProtoFile = require("./lib/ProtoFile");
const ServiceHandler_1 = require("./template/service/ServiceHandler");
const ServiceRegister_1 = require("./template/service/ServiceRegister");
const debug = require('debug')('matrix:service');
const pkg = require('../package.json');
// node ./build/matrix.js service -p ./examples/proto -o ./examples/output -i ./examples/proto_modules -e ./examples/proto_modules/google
program.version(pkg.version)
    .option('-p, --proto <dir>', 'directory of source proto files')
    .option('-o, --output <dir>', 'directory to output codes')
    .option('-i, --import <items>', 'third party proto import path: e.g path1,path2,path3', (val) => val.split(','))
    .option('-e, --exclude <items>', 'files or paths in -p shall be excluded: e.g file1,path1,path2,file2', (val) => val.split(','))
    .parse(process.argv);
const PROTO_DIR = program.proto === undefined ? undefined : Utility.getAbsolutePath(program.proto);
const OUTPUT_DIR = program.output === undefined ? undefined : Utility.getAbsolutePath(program.output);
const EXCLUDES = program.exclude === undefined ? [] : program.exclude;
const IMPORTS = program.import === undefined ? [] : program.import;
class CLI {
    constructor() {
        this._protoFiles = [];
        this._protoImportMap = new Map();
    }
    static instance() {
        return new CLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('CLI start.');
            yield this._validate();
            yield this._loadProtoFile();
            yield this._genServiceCode();
            debug('CLI run over.');
        });
    }
    _validate() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!PROTO_DIR) {
                throw new Error('--proto is required');
            }
            if (!OUTPUT_DIR) {
                throw new Error('--output is required');
            }
            if (!(yield LibFs.pathExists(PROTO_DIR))) {
                throw new Error('--proto is not exist');
            }
            if (!(yield LibFs.pathExists(OUTPUT_DIR))) {
                throw new Error('--output is not exist');
            }
            let protoStat = yield LibFs.stat(PROTO_DIR);
            if (!protoStat.isDirectory()) {
                throw new Error('--proto is not a directory');
            }
            let outputStat = yield LibFs.stat(OUTPUT_DIR);
            if (!outputStat.isDirectory()) {
                throw new Error('--output is not a directory');
            }
        });
    }
    _loadProtoFile() {
        return __awaiter(this, void 0, void 0, function* () {
            this._protoFiles = this._protoFiles.concat(yield ProtoFile.readProtoFiles(PROTO_DIR, OUTPUT_DIR, EXCLUDES));
            if (IMPORTS.length > 0) {
                for (let i = 0; i < IMPORTS.length; i++) {
                    this._protoFiles = this._protoFiles.concat(yield ProtoFile.readProtoFiles(Utility.getAbsolutePath(IMPORTS[i]), OUTPUT_DIR, EXCLUDES));
                }
            }
        });
    }
    _genServiceCode() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._protoFiles.length === 0) {
                throw new Error('no proto files found');
            }
            // 创建 services 默认文件夹
            let servicePath = LibPath.join(OUTPUT_DIR, 'services');
            if (!LibFs.existsSync(servicePath)) {
                yield LibFs.mkdir(servicePath);
            }
            // 通过 protoFile 获取 proto 结构，并保存所有 proto 的 importName 以及相关信息，已被后面计算 import 相关信息
            const protos = yield Promise.all(this._protoFiles.map((protoFile) => __awaiter(this, void 0, void 0, function* () {
                const protoParser = yield Proto.parseProto(protoFile);
                const protoInfoMap = yield Proto.parseProtoInfo(protoParser, protoFile);
                protoInfoMap.forEach((protoInfo, importName) => {
                    this._protoImportMap.set(importName, protoInfo);
                });
                return {
                    protoParser: protoParser,
                    protoFile: protoFile,
                    protoInfoMap: protoInfoMap,
                };
            })));
            // Service Register 模板结构
            let servicesInfos = [];
            // 遍历 protoInfoMap 更新
            protos.forEach((proto) => {
                if (proto.protoInfoMap.size == 0) {
                    return;
                }
                // handle excludes
                let filePath = LibPath.join(proto.protoFile.protoPath, proto.protoFile.relativePath, proto.protoFile.fileName);
                let shallIgnore = Utility.shallIgnore(filePath, EXCLUDES);
                if (shallIgnore) {
                    return;
                }
                let service = {
                    protoFile: proto.protoFile,
                    protoServiceImportPath: ProtoFile.genProtoServiceImportPath(proto.protoFile),
                    protoService: {}
                };
                proto.protoInfoMap.forEach((protoInfo) => {
                    if (!protoInfo.service) {
                        return;
                    }
                    service.protoService[protoInfo.service.name] = [];
                    Object.keys(protoInfo.service.methods).forEach((methodName) => {
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
            LibFs.writeFileSync(outputPath, ServiceRegister_1.ServiceRegister.print(servicesInfos));
        });
    }
    _genServiceMethodCode(protoInfo, method) {
        debug(`Generate service method: ${protoInfo.service.name}.${method.name}`);
        let outputPath = ProtoFile.genFullOutputServicePath(protoInfo.protoFile, protoInfo.service, method);
        let methodInfo = Proto.genRpcMethodInfo(protoInfo.protoFile, method, outputPath, this._protoImportMap);
        if (!method.requestStream && !method.responseStream) {
            methodInfo.callTypeStr = 'IRpcServerUnaryCall';
            methodInfo.callGenerics = `<${methodInfo.requestTypeStr}>`;
            methodInfo.hasCallback = true;
            methodInfo.hasRequest = true;
        }
        else if (!method.requestStream && method.responseStream) {
            methodInfo.callTypeStr = 'IRpcServerWriteableStream';
            methodInfo.callGenerics = `<${methodInfo.requestTypeStr}>`;
            methodInfo.hasRequest = true;
        }
        else if (method.requestStream && !method.responseStream) {
            methodInfo.callTypeStr = 'IRpcServerCallback';
            methodInfo.callGenerics = `<${methodInfo.requestTypeStr}>`;
            methodInfo.hasCallback = true;
        }
        else if (method.requestStream && method.responseStream) {
            methodInfo.callTypeStr = 'IRpcServerDuplexStream';
            methodInfo.callGenerics = `<${methodInfo.requestTypeStr}, ${methodInfo.responseTypeStr}>`;
        }
        let outputDir = LibPath.dirname(outputPath);
        if (!LibFs.existsSync(outputDir)) {
            LibFs.mkdirsSync(outputDir);
        }
        LibFs.writeFileSync(outputPath, ServiceHandler_1.ServiceHandler.print(methodInfo));
    }
}
CLI.instance().run().catch((err) => {
    console.log('err: ', err.message);
});
