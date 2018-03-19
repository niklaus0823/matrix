import * as Proto from '../../lib/Proto';
import * as Utility from '../../lib/Utility';
import {Printer} from '../../lib/Printer';
import {TplFieldInfo} from '../fieldInfo';

export namespace TplGatewayApi {

    export const print = (methodInfo: Proto.RpcMethodInfo, methodRequestField: Proto.FieldInfoMap): string => {
        const printer = new Printer(0);
        printer.printLn(`import {GatewayApiBase, GatewayContext, MiddlewareNext, joi, joiType} from 'matrixes-lib';`);
        Object.keys(methodInfo.protoMsgImportPath).forEach((importPath) => {
            printer.printLn(`import {${methodInfo.protoMsgImportPath[importPath].join(', ')}} from '${importPath}';`);
        });

        printer.printEmptyLn();
        printer.printLn(`interface RequestParams {`);
        printer.printLn(`body: ${methodInfo.requestTypeStr}.AsObject;`, 1);
        printer.printLn(`}`);

        printer.printEmptyLn();
        printer.printLn(`class ${Utility.ucFirst(methodInfo.methodName)} extends GatewayApiBase {`);

        printer.printEmptyLn();
        printer.printLn(`constructor() {`, 1);
        printer.printLn(`super();`, 2);
        printer.printLn(`this.method = '${methodInfo.options.method}';`, 2);
        printer.printLn(`this.uri = '${methodInfo.options.uri}';`, 2);
        printer.printLn(`this.type = 'application/json; charset=utf-8';`, 2);
        printer.printLn(`this.schemaDefObj = {`, 2);
        printer.printLn(`body: joi.object().keys({`, 3);
        Object.keys(methodRequestField).forEach((fieldName: string) => {
            let fieldInfo = methodRequestField[fieldName] as Proto.FieldInfo;
            TplFieldInfo.print(printer, fieldInfo, 4);
        });
        printer.printLn(`})`, 3);
        printer.printLn(`};`, 2);
        printer.printLn(`}`, 1);

        printer.printEmptyLn();
        printer.printLn(`public async handle(ctx: GatewayContext, next: MiddlewareNext, params: RequestParams): Promise<${methodInfo.responseTypeStr}.AsObject> {`, 1);
        printer.printLn(`return Promise.resolve((new ${methodInfo.responseTypeStr}()).toObject());`, 2);
        printer.printLn(`}`, 1);

        printer.printEmptyLn();
        printer.printLn(`public async handleMock(ctx: GatewayContext, next: MiddlewareNext, params: RequestParams): Promise<${methodInfo.responseTypeStr}.AsObject> {`, 1);
        printer.printLn(`return Promise.resolve((new ${methodInfo.responseTypeStr}()).toObject());`, 2);
        printer.printLn(`}`, 1);

        printer.printLn(`}`);

        printer.printEmptyLn();
        printer.printLn(`export const api = new ${Utility.ucFirst(methodInfo.methodName)}();`);

        return printer.getOutput();
    };
}