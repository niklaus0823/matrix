"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Printer_1 = require("../lib/Printer");
var RpcGatewayRouterTpl;
(function (RpcGatewayRouterTpl) {
    RpcGatewayRouterTpl.print = (servicesInfos) => {
        const printer = new Printer_1.Printer(0);
        printer.printLn(`import * as Router from 'koa-router';`);
        printer.printLn(`import {GatewayApiBase} from 'matrixes-lib';`);
        printer.printLn(`const API_PATHS = [`);
        printer.printLn(`];`);
        return printer.getOutput();
    };
})(RpcGatewayRouterTpl = exports.RpcGatewayRouterTpl || (exports.RpcGatewayRouterTpl = {}));
