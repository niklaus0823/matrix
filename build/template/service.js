"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Printer_1 = require("../lib/Printer");
var RpcServerMiddlewareTpl;
(function (RpcServerMiddlewareTpl) {
    RpcServerMiddlewareTpl.print = (methodInfo) => {
        const printer = new Printer_1.Printer(0);
        printer.printLn(`import {RpcContext, RpcMiddleware, MiddlewareNext, ${methodInfo.hasCallback ? 'IRpcServerCallback, ' : ''}${methodInfo.callTypeStr}} from 'matrixes-lib';`);
        Object.keys(methodInfo.protoMsgImportPath).forEach((importPath) => {
            printer.printLn(`import {${methodInfo.protoMsgImportPath[importPath].join(', ')}} from '${importPath}';`);
        });
        printer.printEmptyLn();
        printer.printLn(`export const ${methodInfo.methodName}Handler: RpcMiddleware = async (ctx: RpcContext, next: MiddlewareNext) => {`);
        printer.printLn(`let call = ctx.call as ${methodInfo.callTypeStr}${methodInfo.callGenerics};`, 1);
        if (methodInfo.hasCallback) {
            printer.printLn(`let callback = ctx.callback as IRpcServerCallback<${methodInfo.responseTypeStr}>;`, 1);
        }
        if (methodInfo.hasRequest) {
            printer.printLn(`let request = call.request as ${methodInfo.requestTypeStr};`, 1);
        }
        printer.printEmptyLn();
        printer.printLn(`await next();`, 1);
        printer.printEmptyLn();
        printer.printLn(`return Promise.resolve();`, 1);
        printer.printLn(`};`);
        return printer.getOutput();
    };
})(RpcServerMiddlewareTpl = exports.RpcServerMiddlewareTpl || (exports.RpcServerMiddlewareTpl = {}));
var RpcServerMiddlewareRegisterTpl;
(function (RpcServerMiddlewareRegisterTpl) {
    RpcServerMiddlewareRegisterTpl.print = (serviceInfos) => {
        const printer = new Printer_1.Printer(0);
        printer.printLn(`import {RpcApplication, WrappedHandler} from 'matrixes-lib';`);
        printer.printEmptyLn();
        serviceInfos.forEach((servicesInfo) => {
            let serviceNames = Object.keys(servicesInfo.services).map((value => value + 'Service'));
            printer.printLn(`import {${serviceNames.join(', ')}} from '${servicesInfo.pbSvcImportPath}';`);
        });
        printer.printEmptyLn();
        serviceInfos.forEach((servicesInfo) => {
            Object.keys(servicesInfo.serviceMethods).forEach((serviceName) => {
                Object.keys(servicesInfo.serviceMethods[serviceName]).forEach((methodName) => {
                    printer.printLn(`import {${methodName}Handler} from './${(servicesInfo.protoFile.relativePath === '.') ? '' : servicesInfo.protoFile.relativePath}/${servicesInfo.protoFile.pbSvcNamespace}/${serviceName}/${methodName}';`);
                });
            });
        });
        printer.printEmptyLn();
        printer.printLn(`export const registerServices = function (app: RpcApplication) {`);
        serviceInfos.forEach((servicesInfo) => {
            Object.keys(servicesInfo.serviceMethods).forEach((serviceName) => {
                printer.printLn(`app.server.addService(${serviceName}Service, {`, 1);
                Object.keys(servicesInfo.serviceMethods[serviceName]).forEach((methodName) => {
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
})(RpcServerMiddlewareRegisterTpl = exports.RpcServerMiddlewareRegisterTpl || (exports.RpcServerMiddlewareRegisterTpl = {}));
