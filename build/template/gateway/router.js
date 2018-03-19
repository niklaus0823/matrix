"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Printer_1 = require("../../lib/Printer");
var TplGatewayRouter;
(function (TplGatewayRouter) {
    TplGatewayRouter.print = (serviceInfos) => {
        const printer = new Printer_1.Printer(0);
        printer.printLn(`import {GatewayApiBase, KoaRouter} from 'matrixes-lib';`);
        printer.printEmptyLn();
        printer.printLn(`const API_PATHS = [`);
        serviceInfos.forEach((servicesInfo) => {
            Object.keys(servicesInfo.gatewayMethods).forEach((serviceName) => {
                Object.keys(servicesInfo.gatewayMethods[serviceName]).forEach((methodName) => {
                    printer.printLn(`'./${(servicesInfo.protoFile.relativePath === '.') ? '' : servicesInfo.protoFile.relativePath}/${serviceName}/${methodName}',`, 1);
                });
            });
        });
        printer.printLn(`];`);
        printer.printEmptyLn();
        printer.printLn(`export default class RouteLoader {`);
        printer.printEmptyLn();
        printer.printLn(`private static _instance: RouteLoader;`, 1);
        printer.printLn(`private _initialized: boolean;`, 1);
        printer.printLn(`private _router: KoaRouter;`, 1);
        printer.printEmptyLn();
        printer.printLn(`private constructor() {
        this._initialized = false;
        this._router = new KoaRouter();
    }`, 1);
        printer.printEmptyLn();
        printer.printLn(`public static instance(): RouteLoader {
        if (RouteLoader._instance === undefined) {
            RouteLoader._instance = new RouteLoader();
        }
        return RouteLoader._instance;
    }`, 1);
        printer.printEmptyLn();
        printer.printLn(`public init(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // create koa-router
            let queue = [] as Array<Promise<void>>;
            for (let path of API_PATHS) {
                queue.push(this._createRouter(path));
            }

            // promise queue
            Promise.all(queue).then(() => {
                this._initialized = true;
                resolve(true);
            }).catch((err: Error) => {
                reject(err);
            });
        });
    }`, 1);
        printer.printEmptyLn();
        printer.printLn(`public getRouter(): KoaRouter {
        return this._router;
    }`, 1);
        printer.printEmptyLn();
        printer.printLn(`private async _createRouter(path: string): Promise<void> {
        try {
            let api = require(path).api as GatewayApiBase;
            this._router[api.method].apply(this._router, api.register());
        } catch (err) {
            console.error(err.toString());
        }
    }`, 1);
        printer.printLn(`}`);
        return printer.getOutput();
    };
})(TplGatewayRouter = exports.TplGatewayRouter || (exports.TplGatewayRouter = {}));
