"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Printer {
    constructor(indentLevel) {
        this.output = '';
        this.indentStr = generateIndent(indentLevel);
    }
    printLn(str, indentLevel) {
        this.output += this.indentStr + generateIndent(indentLevel) + str + '\n';
    }
    print(str, indentLevel) {
        this.output += generateIndent(indentLevel) + str;
    }
    printIndentedLn(str, indentLevel) {
        this.output += this.indentStr + generateIndent(indentLevel) + '  ' + str + '\n';
    }
    printEmptyLn() {
        this.output += '\n';
    }
    getOutput() {
        return this.output;
    }
}
exports.Printer = Printer;
function generateIndent(indentLevel) {
    let indent = '';
    for (let i = 0; i < indentLevel; i++) {
        indent += '    ';
    }
    return indent;
}
