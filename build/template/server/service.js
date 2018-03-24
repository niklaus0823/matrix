"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Printer_1 = require("../../lib/Printer");
const fieldInfo_1 = require("../fieldInfo");
var TplRpcServerService;
(function (TplRpcServerService) {
    TplRpcServerService.print = (methodInfo, methodRequestField) => {
        const printer = new Printer_1.Printer(0);
        printer.printLn(`import {RpcContext, RpcMiddleware, MiddlewareNext, ${methodInfo.hasCallback ? 'IRpcServerCallback, ' : ''}${methodInfo.callTypeStr}, joi, joiType} from 'matrixes-lib';`);
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
        let methodRequestFieldNames = Object.keys(methodRequestField);
        if (methodRequestFieldNames.length > 0) {
            switch (methodInfo.callTypeStr) {
                case 'IRpcServerUnaryCall':
                    printer.printEmptyLn();
                    printer.printLn(`try {`, 1);
                    printer.printLn(`await ctx.validate(request, {`, 2);
                    methodRequestFieldNames.forEach((fieldName) => {
                        let fieldInfo = methodRequestField[fieldName];
                        fieldInfo_1.TplFieldInfo.printJoiValidate(printer, fieldInfo, 3);
                    });
                    printer.printLn(`});`, 2);
                    printer.printLn(`callback(null, new ${methodInfo.responseTypeStr}());`, 2);
                    printer.printLn(`} catch (e) {`, 1);
                    printer.printLn(`callback(e, null);`, 2);
                    printer.printLn(`}`, 1);
                    break;
                case 'IRpcServerWriteableStream':
                    printer.printEmptyLn();
                    printer.printLn(`try {`, 1);
                    printer.printLn(`await ctx.validate(request, {`, 2);
                    methodRequestFieldNames.forEach((fieldName) => {
                        let fieldInfo = methodRequestField[fieldName];
                        fieldInfo_1.TplFieldInfo.printJoiValidate(printer, fieldInfo, 3);
                    });
                    printer.printLn(`});`, 2);
                    printer.printLn(`call.write(new ${methodInfo.responseTypeStr}());`, 2);
                    printer.printLn(`} catch (e) {`, 1);
                    printer.printLn(`call.emit('error', e);`, 2);
                    printer.printLn(`}`, 1);
                    printer.printEmptyLn();
                    printer.printLn(`call.end();`, 1);
                    break;
                case 'IRpcServerReadableStream':
                    printer.printEmptyLn();
                    printer.printLn(`call.on('data', async (request: ${methodInfo.requestTypeStr}) => {`, 1);
                    printer.printLn(`try {`, 2);
                    printer.printLn(`await ctx.validate(request, {`, 3);
                    Object.keys(methodRequestField).forEach((fieldName) => {
                        let fieldInfo = methodRequestField[fieldName];
                        fieldInfo_1.TplFieldInfo.printJoiValidate(printer, fieldInfo, 4);
                    });
                    printer.printLn(`});`, 3);
                    printer.printLn(`callback(null, new ${methodInfo.responseTypeStr}());`, 3);
                    printer.printLn(`} catch (e) {`, 2);
                    printer.printLn(`callback(e, null);`, 3);
                    printer.printLn(`}`, 2);
                    printer.printLn(`});`, 1);
                    break;
                case 'IRpcServerDuplexStream':
                    printer.printEmptyLn();
                    printer.printLn(`call.on('data', async (request: ${methodInfo.requestTypeStr}) => {`, 1);
                    printer.printLn(`try {`, 2);
                    printer.printLn(`await ctx.validate(request, {`, 3);
                    Object.keys(methodRequestField).forEach((fieldName) => {
                        let fieldInfo = methodRequestField[fieldName];
                        fieldInfo_1.TplFieldInfo.printJoiValidate(printer, fieldInfo, 4);
                    });
                    printer.printLn(`});`, 3);
                    printer.printLn(`call.write(new ${methodInfo.responseTypeStr}());`, 3);
                    printer.printLn(`} catch (e) {`, 2);
                    printer.printLn(`call.emit('error', e);`, 3);
                    printer.printLn(`}`, 2);
                    printer.printLn(`});`, 1);
                    printer.printEmptyLn();
                    printer.printLn(`call.end();`, 1);
                    break;
            }
        }
        printer.printEmptyLn();
        printer.printLn(`await next();`, 1);
        printer.printEmptyLn();
        printer.printLn(`return Promise.resolve();`, 1);
        printer.printLn(`};`);
        return printer.getOutput();
    };
})(TplRpcServerService = exports.TplRpcServerService || (exports.TplRpcServerService = {}));
