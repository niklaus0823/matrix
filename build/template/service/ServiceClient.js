"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Printer_1 = require("../../lib/Printer");
var ServiceClient;
(function (ServiceClient) {
    ServiceClient.print = (protoInfo) => {
        const printer = new Printer_1.Printer(0);
        printer.printLn(`import * as grpc from 'grpc';`);
        printer.printLn(`import {GatewayContext, RpcContext} from 'matrixes-lib'`);
        printer.printLn(`import {${protoInfo.service.name}Client} from '../../proto/book/book_grpc_pb';`);
        printer.printEmptyLn();
        return printer.getOutput();
    };
})(ServiceClient = exports.ServiceClient || (exports.ServiceClient = {}));
