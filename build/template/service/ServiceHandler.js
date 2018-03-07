"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Printer_1 = require("../../lib/Printer");
var ServiceHandler;
(function (ServiceHandler) {
    ServiceHandler.print = (methodInfo) => {
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
})(ServiceHandler = exports.ServiceHandler || (exports.ServiceHandler = {}));
