import * as Proto from '../lib/Proto';
import * as ProtoFile from '../lib/ProtoFile';
import {Printer} from '../lib/Printer';

export namespace RpcGatewayRouterTpl {

    export const print = (servicesInfos: Array<ProtoFile.ProtoServices>): string => {
        const printer = new Printer(0);
        printer.printLn(`import * as Router from 'koa-router';`);
        printer.printLn(`import {GatewayApiBase} from 'matrixes-lib';`);

        printer.printLn(`const API_PATHS = [`);

        printer.printLn(`];`);

        return printer.getOutput();
    };
}