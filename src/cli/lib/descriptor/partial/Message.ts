import {
    FieldDescriptorProto,
    FileDescriptorProto,
    DescriptorProto,
    OneofDescriptorProto
} from 'google-protobuf/google/protobuf/descriptor_pb';
import {Printer} from '../../Printer';
import {ExportMap} from '../../ExportMap';
import {Utility} from '../../Utility';
import {BYTES_TYPE, ENUM_TYPE, MESSAGE_TYPE, FieldTypes} from './FieldTypes';

import {Enum} from './Enum';
import {OneOf} from './OneOf';
import {Extension} from './Extensions';

export const OBJECT_TYPE_NAME = 'AsObject';

export namespace Message {

    export interface MessageType {
        messageName: string;
        oneOfGroups: Array<Array<FieldDescriptorProto>>;
        oneOfDeclList: Array<OneofDescriptorProto>;
        fields: Array<MessageFieldType>;
        nestedTypes: Array<string>;
        formattedEnumListStr: Array<string>;
        formattedOneOfListStr: Array<string>;
        formattedExtListStr: Array<string>;
    }

    export const defaultMessageType = JSON.stringify({
        messageName: '',
        oneOfGroups: [],
        oneOfDeclList: [],
        fields: [],
        nestedTypes: [],
        formattedEnumListStr: [],
        formattedOneOfListStr: [],
        formattedExtListStr: [],
    } as MessageType);

    export interface MessageFieldType {
        snakeCaseName: string;
        camelCaseName: string;
        camelUpperName: string;
        type: FieldDescriptorProto.Type;
        exportType: string;
    }

    export const defaultMessageFieldType = JSON.stringify({
        snakeCaseName: '',
        camelCaseName: '',
        camelUpperName: '',
        type: undefined,
        exportType: '',
    } as MessageFieldType);

    export function hasFieldPresence(field: FieldDescriptorProto, fileDescriptor: FileDescriptorProto): boolean {
        if (field.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED) {
            return false;
        }

        if (field.hasOneofIndex()) {
            return true;
        }

        if (field.getType() === MESSAGE_TYPE) {
            return true;
        }

        return (Utility.isProto2(fileDescriptor));
    }


    export function print(fileName: string, exportMap: ExportMap, descriptor: DescriptorProto, indentLevel: number, fileDescriptor: FileDescriptorProto) {

        let messageData = JSON.parse(defaultMessageType) as MessageType;

        messageData.messageName = descriptor.getName();
        messageData.oneOfDeclList = descriptor.getOneofDeclList();
        let messageOptions = descriptor.getOptions();
        if (messageOptions !== undefined && messageOptions.getMapEntry()) {
            // this message type is the entry tuple for a map - don't output it
            return '';
        }

        const printer = new Printer(indentLevel);
        printer.printEmptyLn();
        printer.printLn(`export class ${messageData.messageName} extends jspb.Message {`);

        const printerToObjectType = new Printer(indentLevel + 1);
        printerToObjectType.printLn(`export type ${OBJECT_TYPE_NAME} = {`);

        const oneOfGroups: Array<Array<FieldDescriptorProto>> = [];

        descriptor.getFieldList().forEach(field => {

            let fieldData = JSON.parse(defaultMessageFieldType) as MessageFieldType;

            if (field.hasOneofIndex()) {
                let oneOfIndex = field.getOneofIndex();
                let existing = oneOfGroups[oneOfIndex];
                if (existing === undefined) {
                    existing = [];
                    oneOfGroups[oneOfIndex] = existing;
                }
                existing.push(field);
            }

            fieldData.snakeCaseName = field.getName().toLowerCase();
            fieldData.camelCaseName = Utility.snakeToCamel(fieldData.snakeCaseName);
            fieldData.camelUpperName = Utility.ucFirst(fieldData.camelCaseName);
            fieldData.type = field.getType();

            let exportType;

            let fullTypeName = field.getTypeName().slice(1);
            let withinNamespace: string;
            switch (fieldData.type) {
                case MESSAGE_TYPE:
                    const fieldMessageType = exportMap.getMessage(fullTypeName);
                    if (fieldMessageType === undefined) {
                        throw new Error('No message export for: ' + fullTypeName);
                    }

                    if (fieldMessageType.messageOptions !== undefined && fieldMessageType.messageOptions.getMapEntry()) {
                        let keyTuple = fieldMessageType.mapFieldOptions!.key;
                        let keyType = keyTuple[0] as FieldDescriptorProto.Type;
                        let keyTypeName = FieldTypes.getFieldType(keyType, keyTuple[1] as string, fileName, exportMap);
                        let valueTuple = fieldMessageType.mapFieldOptions!.value;
                        let valueType = valueTuple[0] as FieldDescriptorProto.Type;
                        let valueTypeName = FieldTypes.getFieldType(valueType, valueTuple[1] as string, fileName, exportMap);
                        if (valueType === BYTES_TYPE) {
                            valueTypeName = 'Uint8Array | string';
                        }
                        printer.printIndentedLn(`get${fieldData.camelUpperName}Map(): jspb.Map<${keyTypeName}, ${valueTypeName}>;`);
                        printer.printIndentedLn(`clear${fieldData.camelUpperName}Map(): void;`);
                        printerToObjectType.printIndentedLn(`${fieldData.camelCaseName}Map: Array<[${keyTypeName}${keyType === MESSAGE_TYPE ? '.AsObject' : ''}, ${valueTypeName}${valueType === MESSAGE_TYPE ? '.AsObject' : ''}]>,`);
                        return;
                    }

                    withinNamespace = Utility.withinNamespaceFromExportEntry(fullTypeName, fieldMessageType);
                    if (fieldMessageType.fileName === fileName) {
                        exportType = withinNamespace;
                    } else {
                        exportType = Utility.filePathToPseudoNamespace(fieldMessageType.fileName) + '.' + withinNamespace;
                    }
                    fieldData.exportType = exportType;
                    break;

                case ENUM_TYPE:
                    let fieldEnumType = exportMap.getEnum(fullTypeName);
                    if (fieldEnumType === undefined) {
                        throw new Error('No enum export for: ' + fullTypeName);
                    }
                    withinNamespace = Utility.withinNamespaceFromExportEntry(fullTypeName, fieldEnumType);
                    if (fieldEnumType.fileName === fileName) {
                        exportType = withinNamespace;
                    } else {
                        exportType = Utility.filePathToPseudoNamespace(fieldEnumType.fileName) + '.' + withinNamespace;
                    }
                    fieldData.exportType = exportType;
                    break;

                default:
                    fieldData.exportType = FieldTypes.getTypeName(fieldData.type);
                    break;
            }

            let hasClearMethod = false;

            function printClearIfNotPresent() {
                if (!hasClearMethod) {
                    hasClearMethod = true;
                    printer.printIndentedLn(`clear${fieldData.camelUpperName}${field.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED ? 'List' : ''}(): void;`);
                }
            }

            function printRepeatedAddMethod(valueType: string) {
                const optionalValue = field.getType() === MESSAGE_TYPE;
                printer.printIndentedLn(`add${fieldData.camelUpperName}(value${optionalValue ? '?' : ''}: ${valueType}, index?: number): ${valueType};`);
            }

            if (Message.hasFieldPresence(field, fileDescriptor)) {
                printer.printIndentedLn(`has${fieldData.camelUpperName}(): boolean;`);
                printClearIfNotPresent();
            }

            if (field.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED) {// is repeated
                printClearIfNotPresent();

                if (fieldData.type === BYTES_TYPE) {
                    printerToObjectType.printIndentedLn(`${fieldData.camelCaseName}List: Array<Uint8Array | string>,`);
                    printer.printIndentedLn(`get${fieldData.camelUpperName}List(): Array<Uint8Array | string>;`);
                    printer.printIndentedLn(`get${fieldData.camelUpperName}List_asU8(): Array<Uint8Array>;`);
                    printer.printIndentedLn(`get${fieldData.camelUpperName}List_asB64(): Array<string>;`);
                    printer.printIndentedLn(`set${fieldData.camelUpperName}List(value: Array<Uint8Array | string>): void;`);
                    printRepeatedAddMethod('Uint8Array | string');
                } else {
                    printerToObjectType.printIndentedLn(`${fieldData.camelCaseName}List: Array<${fieldData.exportType}${fieldData.type === MESSAGE_TYPE ? '.AsObject' : ''}>,`);
                    printer.printIndentedLn(`get${fieldData.camelUpperName}List(): Array<${fieldData.exportType}>;`);
                    printer.printIndentedLn(`set${fieldData.camelUpperName}List(value: Array<${fieldData.exportType}>): void;`);
                    printRepeatedAddMethod(fieldData.exportType);
                }
            } else {
                if (fieldData.type === BYTES_TYPE) {
                    printerToObjectType.printIndentedLn(`${fieldData.camelCaseName}: Uint8Array | string,`);
                    printer.printIndentedLn(`get${fieldData.camelUpperName}(): Uint8Array | string;`);
                    printer.printIndentedLn(`get${fieldData.camelUpperName}_asU8(): Uint8Array;`);
                    printer.printIndentedLn(`get${fieldData.camelUpperName}_asB64(): string;`);
                    printer.printIndentedLn(`set${fieldData.camelUpperName}(value: Uint8Array | string): void;`);
                } else {
                    let fieldObjectType = fieldData.exportType;
                    let canBeUndefined = false;
                    if (fieldData.type === MESSAGE_TYPE) {
                        fieldObjectType += '.AsObject';
                        if (!Utility.isProto2(fileDescriptor) || (field.getLabel() === FieldDescriptorProto.Label.LABEL_OPTIONAL)) {
                            canBeUndefined = true;
                        }
                    } else {
                        if (Utility.isProto2(fileDescriptor)) {
                            canBeUndefined = true;
                        }
                    }
                    const fieldObjectName = Utility.normaliseFieldObjectName(fieldData.camelCaseName);
                    printerToObjectType.printIndentedLn(`${fieldObjectName}${canBeUndefined ? '?' : ''}: ${fieldObjectType},`);
                    printer.printIndentedLn(`get${fieldData.camelUpperName}(): ${fieldData.exportType}${canBeUndefined ? ' | undefined' : ''};`);
                    printer.printIndentedLn(`set${fieldData.camelUpperName}(value${fieldData.type === MESSAGE_TYPE ? '?' : ''}: ${fieldData.exportType}): void;`);
                }
            }

            printer.printEmptyLn();
        });

        printerToObjectType.printLn(`}`);

        descriptor.getOneofDeclList().forEach(oneOfDecl => {
            printer.printIndentedLn(`get${Utility.oneOfName(oneOfDecl.getName())}Case(): ${messageData.messageName}.${Utility.oneOfName(oneOfDecl.getName())}Case;`);
        });

        printer.printIndentedLn(`serializeBinary(): Uint8Array;`);
        printer.printIndentedLn(`toObject(includeInstance?: boolean): ${messageData.messageName}.${OBJECT_TYPE_NAME};`);
        printer.printIndentedLn(`static toObject(includeInstance: boolean, msg: ${messageData.messageName}): ${messageData.messageName}.${OBJECT_TYPE_NAME};`);
        printer.printIndentedLn(`static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};`);
        printer.printIndentedLn(`static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};`);
        printer.printIndentedLn(`static serializeBinaryToWriter(message: ${messageData.messageName}, writer: jspb.BinaryWriter): void;`);
        printer.printIndentedLn(`static deserializeBinary(bytes: Uint8Array): ${messageData.messageName};`);
        printer.printIndentedLn(`static deserializeBinaryFromReader(message: ${messageData.messageName}, reader: jspb.BinaryReader): ${messageData.messageName};`);

        printer.printLn(`}`);
        printer.printEmptyLn();

        printer.printLn(`export namespace ${messageData.messageName} {`);

        printer.print(printerToObjectType.getOutput());

        descriptor.getNestedTypeList().forEach(nested => {
            const msgOutput = Message.print(fileName, exportMap, nested, indentLevel + 1, fileDescriptor);
            if (msgOutput !== '') {
                // If the message class is a Map entry then it isn't output, so don't print the namespace block
                printer.print(msgOutput);
            }
        });
        descriptor.getEnumTypeList().forEach(enumType => {
            printer.print(`${Enum.print(enumType, indentLevel + 1)}`);
        });
        descriptor.getOneofDeclList().forEach((oneOfDecl, index) => {
            printer.print(`${OneOf.print(oneOfDecl, oneOfGroups[index] || [], indentLevel + 1)}`);
        });
        descriptor.getExtensionList().forEach(extension => {
            printer.print(Extension.print(fileName, exportMap, extension, indentLevel + 1));
        });

        printer.printLn(`}`);

        return printer.getOutput();
    }
}