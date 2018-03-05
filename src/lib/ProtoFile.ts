import * as Utility from './Utility';
import * as LibPath from 'path';

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
export interface ProtoFile {
    fileName: string;
    filePath: string;
    protoPath: string;
    outputPath: string;
    relativePath: string;
    pbNamespace: string;
    pbSvcNamespace: string;
}

/**
 * 读取 protoDir 文件夹内的 proto 文件名生成 ProtoFile 结构体。
 *
 * @param {string} protoDir
 * @param {string} outputDir
 * @param {Array<string>} excludes
 * @returns {Promise<Array<ProtoFile>>}
 */
export const readProtoFiles = async (protoDir: string, outputDir: string, excludes?: Array<string>): Promise<Array<ProtoFile>> => {
    let files = await Utility.readFiles(protoDir, 'proto', excludes);
    let protoFiles = files.map((file: string) => {
        // 实际上 readFiles 已经进行了前置过滤，这里再做一次过滤。
        if (LibPath.extname(file) !== '.proto') {
            return undefined;
        }

        file = file.replace(protoDir, ''); // remove base dir
        if (file.substr(0, 1) === '/') { // remove first '/'
            file = file.substr(1);
        }

        let protoFile = {} as ProtoFile;
        protoFile.protoPath = protoDir;
        protoFile.outputPath = outputDir;
        protoFile.relativePath = LibPath.dirname(file);
        protoFile.fileName = LibPath.basename(file);
        protoFile.filePath = file;
        protoFile.pbNamespace = filePathToPbNamespace(protoFile.filePath);
        protoFile.pbSvcNamespace = filePathToPbServiceNamespace(protoFile.filePath);
        return protoFile;
    }).filter((value: undefined | ProtoFile) => {
        return value !== undefined;
    });

    return Promise.resolve(protoFiles);
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
 * @param {ProtoFile} protoFile
 * @returns {string}
 */
export const genFullProtoFilePath = (protoFile: ProtoFile): string => {
    return LibPath.join(protoFile.protoPath, protoFile.relativePath, protoFile.fileName);
};