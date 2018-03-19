import * as LibFs from 'fs-extra';
import * as LibPath from 'path';
import * as Utility from './Utility';
import * as Proto from './Proto';

/**
 * eg:
 * matrix
 *  --proto ../../examples/proto
 *  --output ../../examples/output
 *  --import ../../examples/proto_modules
 *  --exclude ../../examples/proto_modules
 *  --all
 *
 * file: ../../examples/proto/book/book.proto
 * =>
 * protoFile.fileName = book.proto
 * protoFile.filePath = book/book.proto
 * protoFile.protoPath = LibPath.join(process.cwd, '../../examples/proto/')     // 绝对路径
 * protoFile.outputPath = LibPath.join(process.cwd, '../../examples/output/')   // 绝对路径
 * protoFile.relativePath = book
 * protoFile.pbNamespace = book_pb
 * protoFile.pbSvcNamespace = book_grpc_pb
 */
export interface ProtoFileType {
    fileName: string;
    filePath: string;
    protoPath: string;
    outputPath: string;
    relativePath: string;
    pbNamespace: string;
    pbSvcNamespace: string;
}

export interface ProtoServices {
    protoFile: ProtoFileType;
    pbImportPath: string;
    pbSvcImportPath: string;
    services: {
        [protoServiceName: string]: protobuf.Service;
    };
    serviceMethods: {
        [protoServiceName: string]: {[serviceMethod: string]: protobuf.Method};
    };
    gatewayMethods: {
        [protoServiceName: string]: {[serviceMethod: string]: protobuf.Method};
    };
}

/**
 * 读取 protoDir 文件夹内的 proto 文件名生成 ProtoFile 结构体。
 *
 * @param {string} protoDir
 * @param {string} outputDir
 * @param {Array<string>} excludes
 * @returns {Promise<Array<ProtoFileType>>}
 */
export const readProtoFiles = async (protoDir: string, outputDir: string, excludes?: Array<string>): Promise<Array<ProtoFileType>> => {
    let files = await Utility.readFiles(protoDir, 'proto', excludes);
    let protoFiles: Array<ProtoFileType> = files.map((file: string) => {
        // 实际上 readFiles 已经进行了前置过滤，这里再做一次过滤。
        if (LibPath.extname(file) !== '.proto') {
            return undefined;
        }

        file = file.replace(protoDir, ''); // remove base dir
        if (file.substr(0, 1) === '/') { // remove first '/'
            file = file.substr(1);
        }

        let protoFile = {} as ProtoFileType;
        protoFile.protoPath = protoDir;
        protoFile.outputPath = outputDir;
        protoFile.relativePath = LibPath.dirname(file);
        protoFile.fileName = LibPath.basename(file);
        protoFile.filePath = file;
        protoFile.pbNamespace = filePathToPbNamespace(protoFile.fileName);
        protoFile.pbSvcNamespace = filePathToPbServiceNamespace(protoFile.fileName);
        return protoFile;
    }).filter((value: undefined | ProtoFileType) => {
        return value !== undefined;
    });

    return Promise.resolve(protoFiles);
};

/**
 * dummy/your.proto => ../
 * dummy/and/dummy/your.proto => ../../../
 * @param {string} filePath
 * @returns {string}
 */
export const getPathToRoot = (filePath: string) => {
    const depth = filePath.replace(/\\/g, '/').split('/').length;
    return depth === 1 ? './' : new Array(depth).join('../');
};

/**
 * dummy/your.proto => dummy_your_pb
 * @param {string} filePath
 * @returns {string}
 */
export const filePathToPbNamespace = (filePath: string): string => {
    return filePath.replace('.proto', '').replace(/\//g, '_').replace(/\./g, '_').replace(/-/g, '_') + '_pb';
};

/**
 * dummy/your.proto => dummy_your_grpc_pb
 * @param {string} filePath
 * @returns {string}
 */
export const filePathToPbServiceNamespace = (filePath: string): string => {
    return filePath.replace('.proto', '').replace(/\//g, '_').replace(/\./g, '_').replace(/-/g, '_') + '_grpc_pb';
};

/**
 * Generate origin protobuf definition (e.g *.proto) full file path.
 * @param {ProtoFileType} protoFile
 * @returns {string}
 */
export const genFullProtoFilePath = (protoFile: ProtoFileType): string => {
    return LibPath.join(
        protoFile.protoPath,
        protoFile.relativePath,
        protoFile.fileName
    );
};

/**
 * Generate full service stub code output path.
 * @param {ProtoFileType} protoFile
 * @param {Service} service
 * @param {Method} method
 * @returns {string}
 */
export const genFullOutputServicePath = (protoFile: ProtoFileType, service: protobuf.Service, method: protobuf.Method) => {
    return LibPath.join(
        protoFile.outputPath,
        'services',
        protoFile.relativePath,
        protoFile.pbSvcNamespace,
        service.name,
        Utility.lcFirst(method.name) + '.ts'
    );
};

/**
 * Generate full service client stub code output path.
 * @param {ProtoFileType} protoFile
 * @param {Service} service
 * @returns {string}
 */
export const genFullOutputServiceClientPath = (protoFile: ProtoFileType, service: protobuf.Service) => {
    return LibPath.join(
        protoFile.outputPath,
        'clients',
        protoFile.relativePath,
        'MS' + service.name + 'Client.ts'
    );
};

/**
 * Generate full service gateway api stub code output path.
 * @param {ProtoFileType} protoFile
 * @param {Service} service
 * @param {Method} method
 * @returns {string}
 */
export const genFullOutputGatewayPath = (protoFile: ProtoFileType, service: protobuf.Service, method: protobuf.Method) => {
    return LibPath.join(
        protoFile.outputPath,
        'router',
        protoFile.relativePath,
        service.name,
        Utility.lcFirst(method.name) + '.ts'
    );
};

/**
 * Generate message proto js file (e.g *_pb.js) import path.
 * Source code path is generated with {@link genFullOutputServicePath},
 * message proto js import path is relative to it.
 * @param {ProtoFileType} protoFile
 * @param {string} filePath
 * @param {string} dirName
 * @returns {string}
 */
export const genProtoImportPath = (protoFile: ProtoFileType, filePath: string, dirName: string = 'services'): string => {
    return LibPath.join(
        getPathToRoot(filePath.substr(filePath.indexOf(dirName))),
        'proto',
        protoFile.relativePath,
        protoFile.pbNamespace
    ).replace(/\\/g, '/');
};

/**
 * Generate service proto js file (e.g *_grpc_pb.js) import path.
 * Source code is "register.ts", service proto js import path is relative to it.
 * @param {ProtoFileType} protoFile
 * @param {string} filePath
 * @param {string} dirName
 * @returns {string}
 */
export const genProtoServiceImportPath = (protoFile: ProtoFileType, filePath: string, dirName: string = 'services'): string => {
    return LibPath.join(
        getPathToRoot(filePath.substr(filePath.indexOf(dirName))),
        'proto',
        protoFile.relativePath,
        protoFile.pbSvcNamespace
    ).replace(/\\/g, '/');
};