import * as Proto from '../lib/Proto';
import * as Utility from '../lib/Utility';
import {Printer} from '../lib/Printer';

export namespace TplFieldInfo {

    export const print = (printer: Printer, field: Proto.FieldInfo, indentLevel?: number) => {
        let {fieldName, fieldType, isRepeated, isMap, fieldInfo} = field;

        if (isRepeated) {
            fieldName = fieldName + 'List';
        } else if (isMap) {
            fieldName = fieldName + 'Map';
        }

        let extraStr: string = _getExtraStr(field);
        let extraMapOrRepeatedStr: string = _getMapOrRepeatedExtraStr(field);

        // 根据 fieldInfo 拆分为两种处理方式，1.存在下层结构，2.不存在下层结构
        if (fieldInfo && fieldInfo !== null) {
            // Means this field has child schema
            if (isRepeated || isMap) {
                printer.printLn(`${fieldName}: ${isRepeated ? 'joi.array().items(' : 'joi.object().pattern(/\\w+/, '}joi.object().keys({`, indentLevel);
            } else {
                printer.printLn(`${fieldName}: joi.object().keys({`, indentLevel);
            }

            Object.keys(fieldInfo).forEach((_fieldName) => {
                print(printer, fieldInfo[_fieldName], indentLevel + 1);
            });

            if (isRepeated || isMap) {
                printer.printLn(`}))${extraMapOrRepeatedStr},`, indentLevel);
            } else {
                printer.printLn(`})${extraStr},`, indentLevel);
            }

        } else {
            if (_isJoiType(fieldType)) {
                // base joiType
                if (isRepeated || isMap) {
                    printer.printLn(`${fieldName}: ${isRepeated ? 'joi.array().items(' : 'joi.object().pattern(/\\w+/, '}joiType.v${Utility.ucFirst(fieldType)}.activate()${extraStr})${extraMapOrRepeatedStr},`, indentLevel);
                } else {
                    printer.printLn(`${fieldName}: joiType.v${Utility.ucFirst(fieldType)}.activate()${extraStr},`, indentLevel);
                }
            } else {
                // joiType undefined
                if (isRepeated || isMap) {
                    printer.printLn(`${fieldName}: ${isRepeated ? 'joi.array().items(' : 'joi.object().pattern(/\\w+/, '}joi.${fieldType}())${extraMapOrRepeatedStr},`, indentLevel);
                } else {
                    printer.printLn(`${fieldName}: joi.${fieldType}()${extraStr},`, indentLevel);
                }
            }
        }
    };


    const _isNumber = (type: string): boolean => {
        return [
            'double',
            'float',
            'int32',
            'int64',
            'uint32',
            'uint64',
            'sint32',
            'sint64',
            'fixed32',
            'fixed64',
            'sfixed32',
            'sfixed64',
        ].indexOf(type) >= 0;
    };

    const _isString = (type: string): boolean => {
        return (type == 'string');
    };

    const _isBoolean = (type: string): boolean => {
        return (type == 'bool');
    };

    const _isJoiType = (type: string): boolean => {
        return (Proto.PROTO_BUFFER_BASE_TYPE.indexOf(type) >= 0);
    };

    const _getExtraStr = (field: Proto.FieldInfo): string => {
        let {fieldType, fieldComment, isMap, isRepeated} = field;

        let extraStr: string = '';

        if (typeof(fieldComment) === 'string') {
            fieldComment = {};
        }

        if (fieldComment !== null && (!isMap && !isRepeated)) {
            if (fieldComment.required) {
                extraStr += '.required()';
            }

            if (fieldComment.defaultValue) {
                extraStr += `.default(${fieldType === 'string' ? `'${fieldComment.defaultValue}'` : fieldComment.defaultValue})`;
            }
        }

        if (fieldComment !== null && _isJoiType(fieldType)) {
            if (_isString(fieldType)) {
                if (fieldComment.regex) {
                    extraStr += `.regex(${fieldComment.regex})`;
                }

                if (fieldComment.enumOption) {
                    const valid = fieldComment.enumOption.map((value) => {
                        return typeof(value) === 'string' ? `'${value}'` : value;
                    });
                    extraStr += `.valid([${valid.join(', ')}])`;
                }

                if (fieldComment.stringLengthMin) {
                    extraStr += `.min(${fieldComment.stringLengthMin})`;
                }

                if (fieldComment.stringLengthMax) {
                    extraStr += `.max(${fieldComment.stringLengthMax})`;
                }
            }

            if (_isNumber(fieldType)) {
                if (fieldComment.enumOption) {
                    const valid = fieldComment.enumOption.map((value) => {
                        return typeof(value) === 'string' ? `'${value}'` : value;
                    });
                    extraStr += `.valid([${valid.join(', ')}])`;
                }

                if (fieldComment.numberMin) {
                    extraStr += `.greater(${fieldComment.numberMin})`;
                }

                if (fieldComment.numberMax) {
                    extraStr += `.less(${fieldComment.numberMax})`;
                }
            }

            if (_isBoolean(fieldType)) {
                if (fieldComment.booleanTruthy) {
                    const truthy = fieldComment.booleanTruthy.map((value) => {
                        return typeof(value) === 'string' ? `'${value}'` : value;
                    });
                    extraStr += `.truthy([${truthy.join(', ')}])`;
                }
                if (fieldComment.booleanFalsy) {
                    const falsy = fieldComment.booleanFalsy.map((value) => {
                        return typeof(value) === 'string' ? `'${value}'` : value;
                    });
                    extraStr += `.falsy([${falsy.join(', ')}])`;
                }
            }
        }

        return extraStr;
    };

    const _getMapOrRepeatedExtraStr = (field: Proto.FieldInfo): string => {
        let {fieldType, fieldComment, isMap, isRepeated} = field;

        let extraStr: string = '';

        if (typeof(fieldComment) === 'string') {
            fieldComment = {};
        }

        if (fieldComment !== null && (isMap || isRepeated)) {
            if (fieldComment.required) {
                extraStr += '.required()';
            }

            if (fieldComment.defaultValue) {
                extraStr += `.default(${fieldType === 'string' ? `'${fieldComment.defaultValue}'` : fieldComment.defaultValue})`;
            }
        }

        return extraStr;
    };
}