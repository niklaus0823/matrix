import * as ProtoFile from '../../lib/ProtoFile';
import {Printer} from '../../lib/Printer';

export namespace ServiceRegister {

    export const print = (servicesInfos: Array<ProtoFile.ProtoServices>): string => {
        const printer = new Printer(0);
        printer.printLn(`import {RpcApplication, WrappedHandler} from 'matrixes-lib';`);
        printer.printEmptyLn();
        servicesInfos.forEach((servicesInfo: ProtoFile.ProtoServices) => {
            let serviceNames = Object.keys(servicesInfo.protoService).map((value => value + 'Service'));
            printer.printLn(`import {${serviceNames.join(', ')}} from '${servicesInfo.protoServiceImportPath}';`);
        });
        printer.printEmptyLn();
        servicesInfos.forEach((servicesInfo: ProtoFile.ProtoServices) => {
            Object.keys(servicesInfo.protoService).forEach((serviceName) => {
                servicesInfo.protoService[serviceName].forEach((methodName) => {
                    printer.printLn(`import {${methodName}Handler} from './${(servicesInfo.protoFile.relativePath === '.') ? '' : servicesInfo.protoFile.relativePath}/${servicesInfo.protoFile.pbSvcNamespace}/${serviceName}/${methodName}';`);
                });
            });
        });
        printer.printEmptyLn();
        printer.printLn(`export const registerServices = function (app: RpcApplication) {`);
        servicesInfos.forEach((servicesInfo: ProtoFile.ProtoServices) => {
            Object.keys(servicesInfo.protoService).forEach((serviceName) => {
                printer.printLn(`app.server.addService(${serviceName}Service, {`, 1);
                servicesInfo.protoService[serviceName].forEach((methodName) => {
                    printer.printLn(`${methodName}: async (call, callback) => {`, 2);
                    printer.printLn(`let wrappedHandler: WrappedHandler = app.wrapGrpcHandler(${methodName}Handler);`, 3);
                    printer.printLn(`wrappedHandler(call, callback).then(_ => _);`, 3);
                    printer.printLn(`},`, 2);
                });
                printer.printLn(`});`, 1);
            });
        });
        printer.printLn(`};`);

        return printer.getOutput();
    };
}