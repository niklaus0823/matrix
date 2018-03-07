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
const LibShell = require("shelljs");
const LibChildProcess = require("child_process");
const Utility = require("./lib/Utility");
const ProtoFile = require("./lib/ProtoFile");
const debug = require('debug')('matrix:proto');
const pkg = require('../package.json');
// node ./build/matrix.js proto -p ./examples/proto -o ./examples/output -i ./examples/proto_modules -e ./examples/proto_modules/google -t -j -a
program.version(pkg.version)
    .option('-p, --proto <dir>', 'directory of source proto files')
    .option('-o, --output <dir>', 'directory to output codes')
    .option('-i, --import <items>', 'third party proto import path: e.g path1,path2,path3', (val) => val.split(','))
    .option('-e, --exclude <items>', 'files or paths in -p shall be excluded: e.g file1,path1,path2,file2', (val) => val.split(','))
    .option('-j, --javascript', 'add -j to output javascript codes')
    .option('-t, --typescript', 'add -t to output typescript d.ts definitions')
    .option('-s, --swagger', 'add -s to output swagger json')
    .option('-a, --all', 'also parse & output all proto files in import path?')
    .parse(process.argv);
const PROTO_DIR = program.proto === undefined ? undefined : Utility.getAbsolutePath(program.proto);
const OUTPUT_DIR = program.output === undefined ? undefined : Utility.getAbsolutePath(program.output);
const EXCLUDES = program.exclude === undefined ? [] : program.exclude;
const IMPORTS = program.import === undefined ? [] : program.import;
const IS_OUTPUT_JS = program.javascript !== undefined;
const IS_OUTPUT_DTS = program.typescript !== undefined;
const IS_OUTPUT_SWAGGER = program.swagger !== undefined;
const OUTPUT_ALL_IMPORT = program.all !== undefined;
class CLI {
    constructor() {
        this._protoFiles = [];
    }
    static instance() {
        return new CLI();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('CLI start.');
            yield this._validate();
            yield this._loadProtoFile();
            yield this._genSourceCode();
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
            if (OUTPUT_ALL_IMPORT && IMPORTS.length > 0) {
                for (let i = 0; i < IMPORTS.length; i++) {
                    this._protoFiles = this._protoFiles.concat(yield ProtoFile.readProtoFiles(Utility.getAbsolutePath(IMPORTS[i]), OUTPUT_DIR, EXCLUDES));
                }
            }
        });
    }
    _genSourceCode() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._protoFiles.length === 0) {
                throw new Error('no proto files found');
            }
            const outputDir = LibPath.join(OUTPUT_DIR, 'proto');
            yield LibFs.mkdirs(outputDir);
            this._protoFiles.forEach((protoFile) => {
                debug(`Generate proto: ${protoFile.fileName}`);
                // build import params
                let imports = '';
                IMPORTS.forEach((importPath) => {
                    imports += ` --proto_path ${Utility.getAbsolutePath(importPath)}`;
                });
                let cmds = [];
                if (IS_OUTPUT_JS) {
                    let cmd = '';
                    cmd += 'protoc-gen-grpc';
                    cmd += ` --js_out=import_style=commonjs,binary:${outputDir}`;
                    cmd += ` --grpc_out=${outputDir}`;
                    cmd += ` --proto_path ${PROTO_DIR}`;
                    cmd += imports;
                    cmd += ` ${ProtoFile.genFullProtoFilePath(protoFile)}`;
                    cmds.push(cmd);
                }
                if (IS_OUTPUT_DTS) {
                    let cmd = '';
                    cmd += 'protoc-gen-grpc-ts';
                    cmd += ` --ts_out=service=true:${outputDir}`;
                    cmd += ` --proto_path ${PROTO_DIR}`;
                    cmd += imports;
                    cmd += ` ${ProtoFile.genFullProtoFilePath(protoFile)}`;
                    cmds.push(cmd);
                }
                if (IS_OUTPUT_SWAGGER) {
                    let goPath = LibChildProcess.execSync('go env GOPATH').toString().replace(/\n$/, '').replace(/\r$/, '');
                    let pluginPath = LibPath.join(goPath, 'bin', `protoc-gen-swagger${process.platform === 'win32' ? '.exe' : ''}`);
                    let cmd = '';
                    cmd += 'protoc-gen';
                    cmd += ` --plugin=protoc-gen-swagger=${pluginPath}`;
                    cmd += ` --swagger_out=:${outputDir}`;
                    cmd += ` --proto_path ${PROTO_DIR}`;
                    cmd += imports;
                    cmd += ` ${ProtoFile.genFullProtoFilePath(protoFile)}`;
                    cmds.push(cmd);
                }
                if (cmds.length === 0) {
                    throw new Error('Choose one of --javascript | --typescript to output');
                }
                cmds.forEach((cmd) => {
                    if (LibShell.exec(cmd).code !== 0) {
                        throw new Error(`err in generating proto: ${protoFile.fileName}`);
                    }
                });
            });
        });
    }
}
CLI.instance().run().catch((err) => {
    console.log('err: ', err.message);
});
