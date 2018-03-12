"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Printer_1 = require("../lib/Printer");
var RpcClientTpl;
(function (RpcClientTpl) {
    RpcClientTpl.print = (service, methodInfos, pbSvcImportPath) => {
        const printer = new Printer_1.Printer(0);
        printer.printLn(`import * as grpc from 'grpc';`);
        printer.printLn(`import {Duplex, Readable, Writable} from 'stream';`);
        printer.printLn(`import {GatewayContext, RpcContext} from 'matrixes-lib';`);
        printer.printLn(`import {${service.name}Client} from '${pbSvcImportPath}';`);
        printer.printEmptyLn();
        let importMethodNames = {};
        Object.keys(methodInfos).forEach((methodName) => {
            let methodInfo = methodInfos[methodName];
            Object.keys(methodInfo.protoMsgImportPath).forEach((importPath) => {
                methodInfo.protoMsgImportPath[importPath].forEach((importMethodName) => {
                    if (!importMethodNames.hasOwnProperty(importPath)) {
                        importMethodNames[importPath] = [];
                    }
                    if (importMethodNames[importPath].indexOf(importMethodName) == -1) {
                        importMethodNames[importPath].push(importMethodName);
                    }
                });
            });
        });
        Object.keys(importMethodNames).forEach((importPath) => {
            printer.printLn(`import {${importMethodNames[importPath].join(', ')}} from '${importPath}';`);
        });
        printer.printEmptyLn();
        printer.printLn(`export default class MS${service.name}Client {`);
        printer.printEmptyLn();
        printer.printLn(`public client: ${service.name}Client;`, 1);
        printer.printEmptyLn();
        printer.printLn(`constructor(address: string, ctx?: GatewayContext | RpcContext) {`, 1);
        printer.printLn(`this.client = new ${service.name}Client(address, grpc.credentials.createInsecure());`, 2);
        printer.printLn(`}`, 1);
        methodInfos.forEach((methodInfo) => {
            printer.printEmptyLn();
            printer.printLn(`// Send ${methodInfo.callTypeStr}`, 1);
            switch (methodInfo.callTypeStr) {
                case 'IRpcServerUnaryCall':
                    printer.printLn(`public ${methodInfo.methodName}(request: ${methodInfo.requestTypeStr}, metadata?: grpc.Metadata): Promise<${methodInfo.responseTypeStr}> {`, 1);
                    printer.printLn(`return new Promise((resolve, reject) => {`, 2);
                    printer.printLn(`this.client.${methodInfo.methodName}(request, metadata, (err: Error, res: ${methodInfo.responseTypeStr}) => {`, 3);
                    printer.printLn(`if (err) {`, 4);
                    printer.printLn(`return reject(err);`, 5);
                    printer.printLn(`}`, 4);
                    printer.printLn(`return resolve(res);`, 4);
                    printer.printLn(`});`, 3);
                    printer.printLn(`});`, 2);
                    printer.printLn(`}`, 1);
                    break;
                case 'IRpcServerWriteableStream':
                    printer.printLn(`public ${methodInfo.methodName}(request: ${methodInfo.requestTypeStr}, metadata?: grpc.Metadata): Promise<Array<${methodInfo.responseTypeStr}>> {`, 1);
                    printer.printLn(`return new Promise((resolve, reject) => {`, 2);
                    printer.printLn(`let call = this.client.${methodInfo.methodName}(request, metadata) as Readable;`, 3);
                    printer.printLn(`let response = [] as Array<${methodInfo.responseTypeStr}>;`, 3);
                    printer.printEmptyLn();
                    printer.printLn(`// receive response stream`, 3);
                    printer.printLn(`call.on('data', (res: ${methodInfo.responseTypeStr}) => {`, 3);
                    printer.printLn(`response.push(res);`, 4);
                    printer.printLn(`});`, 3);
                    printer.printEmptyLn();
                    printer.printLn(`call.on('error', (err: Error) => {`, 3);
                    printer.printLn(`reject(err);`, 4);
                    printer.printLn(`});`, 3);
                    printer.printEmptyLn();
                    printer.printLn(`call.on('end', () => {`, 3);
                    printer.printLn(`resolve(response);`, 4);
                    printer.printLn(`});`, 3);
                    printer.printLn(`});`, 2);
                    printer.printLn(`}`, 1);
                    break;
                case 'IRpcServerReadableStream':
                    printer.printLn(`public ${methodInfo.methodName}(requests: Array<${methodInfo.requestTypeStr}>, metadata?: grpc.Metadata): Promise<${methodInfo.responseTypeStr}> {`, 1);
                    printer.printLn(`return new Promise((resolve, reject) => {`, 2);
                    printer.printLn(`let call = this.client.${methodInfo.methodName}(metadata, (err: Error, res: ${methodInfo.responseTypeStr}) => {`, 3);
                    printer.printLn(`if (err) {`, 4);
                    printer.printLn(`return reject(err);`, 5);
                    printer.printLn(`}`, 4);
                    printer.printLn(`return resolve(res);`, 4);
                    printer.printLn(`}) as Writable;`, 3);
                    printer.printEmptyLn();
                    printer.printLn(`// send request stream`, 3);
                    printer.printLn(`requests.forEach((request: GetBookRequest) => call.write(request));`, 3);
                    printer.printLn(`call.end();`, 3);
                    printer.printLn(`});`, 2);
                    printer.printLn(`}`, 1);
                    break;
                case 'IRpcServerDuplexStream':
                    printer.printLn(`public ${methodInfo.methodName}(requests: Array<${methodInfo.requestTypeStr}>, metadata?: grpc.Metadata): Promise<Array<${methodInfo.responseTypeStr}>> {`, 1);
                    printer.printLn(`return new Promise((resolve, reject) => {`, 2);
                    printer.printLn(`let call = this.client.${methodInfo.methodName}(metadata) as Duplex;`, 3);
                    printer.printLn(`let response = [] as Array<${methodInfo.responseTypeStr}>;`, 3);
                    printer.printEmptyLn();
                    printer.printLn(`// receive response stream`, 3);
                    printer.printLn(`call.on('data', (res: ${methodInfo.responseTypeStr}) => {`, 3);
                    printer.printLn(`response.push(res);`, 4);
                    printer.printLn(`});`, 3);
                    printer.printEmptyLn();
                    printer.printLn(`call.on('error', (err: Error) => {`, 3);
                    printer.printLn(`reject(err);`, 4);
                    printer.printLn(`});`, 3);
                    printer.printEmptyLn();
                    printer.printLn(`call.on('end', () => {`, 3);
                    printer.printLn(`resolve(response);`, 4);
                    printer.printLn(`});`, 3);
                    printer.printEmptyLn();
                    printer.printLn(`// send request stream`, 3);
                    printer.printLn(`requests.forEach((request: GetBookRequest) => call.write(request));`, 3);
                    printer.printLn(`call.end();`, 3);
                    printer.printLn(`});`, 2);
                    printer.printLn(`}`, 1);
                    break;
            }
        });
        printer.printEmptyLn();
        printer.printLn(`}`);
        return printer.getOutput();
    };
})(RpcClientTpl = exports.RpcClientTpl || (exports.RpcClientTpl = {}));
