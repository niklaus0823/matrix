import * as program from 'commander';
import * as LibFs from 'fs-extra';
import * as LibPath from 'path';
import * as LibShell from 'shelljs';
import * as LibChildProcess from 'child_process';
import * as Utility from './lib/Utility';
import * as ProtoFile from './lib/ProtoFile';

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

const PROTO_DIR = (program as any).proto === undefined ? undefined : Utility.getAbsolutePath((program as any).proto);
const OUTPUT_DIR = (program as any).output === undefined ? undefined : Utility.getAbsolutePath((program as any).output);
const EXCLUDES: Array<string> = (program as any).exclude === undefined ? [] : (program as any).exclude;
const IMPORTS: Array<string> = (program as any).import === undefined ? [] : (program as any).import;
const IS_OUTPUT_JS = (program as any).javascript !== undefined;
const IS_OUTPUT_DTS = (program as any).typescript !== undefined;
const IS_OUTPUT_SWAGGER = (program as any).swagger !== undefined;
const OUTPUT_ALL_IMPORT = (program as any).all !== undefined;

class CLI {

    private _protoFiles: Array<ProtoFile.ProtoFileType> = [];

    static instance() {
        return new CLI();
    }

    public async run() {
        debug('CLI start.');

        await this._validate();
        await this._loadProtoFile();
        await this._genSourceCode();

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
        if (OUTPUT_ALL_IMPORT && IMPORTS.length > 0) {
            for (let i = 0; i < IMPORTS.length; i++) {
                this._protoFiles = this._protoFiles.concat(await ProtoFile.readProtoFiles(Utility.getAbsolutePath(IMPORTS[i]), OUTPUT_DIR, EXCLUDES));
            }
        }
    }

    private async _genSourceCode() {
        if (this._protoFiles.length === 0) {
            throw new Error('no proto files found');
        }

        const outputDir = LibPath.join(OUTPUT_DIR, 'proto');
        await LibFs.mkdirs(outputDir);

        this._protoFiles.forEach((protoFile: ProtoFile.ProtoFileType) => {
            debug(`Generate proto: ${protoFile.fileName}`);

            // build import params
            let imports = '';
            IMPORTS.forEach((importPath: string) => {
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

            cmds.forEach((cmd: string) => {
                if (LibShell.exec(cmd).code !== 0) {
                    throw new Error(`err in generating proto: ${protoFile.fileName}`);
                }
            });
        });
    }
}

CLI.instance().run().catch((err: Error) => {
    console.log('err: ', err.message);
});