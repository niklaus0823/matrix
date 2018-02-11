"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Printer_1 = require("../../Printer");
const Utility_1 = require("../../Utility");
const FieldTypes_1 = require("./FieldTypes");
var Extension;
(function (Extension) {
    function print(fileName, exportMap, fieldsDescriptor, indentLevel) {
        const extensionName = Utility_1.Utility.snakeToCamel(fieldsDescriptor.getName());
        const fieldType = FieldTypes_1.FieldTypes.getFieldType(fieldsDescriptor.getType(), fieldsDescriptor.getTypeName().slice(1), fileName, exportMap);
        const printer = new Printer_1.Printer(indentLevel + 1);
        printer.printEmptyLn();
        printer.printLn(`export const ${extensionName}: jspb.ExtensionFieldInfo<${fieldType}>;`);
        return printer.output;
    }
    Extension.print = print;
})(Extension = exports.Extension || (exports.Extension = {}));
