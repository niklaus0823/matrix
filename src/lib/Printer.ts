export class Printer {
    indentStr: string;
    output: string = '';

    constructor(indentLevel: number) {
        this.indentStr = generateIndent(indentLevel);
    }

    printLn(str: string, indentLevel?: number) {
        this.output += this.indentStr + generateIndent(indentLevel) + str + '\n';
    }

    print(str: string, indentLevel?: number) {
        this.output += generateIndent(indentLevel) + str;
    }

    printIndentedLn(str: string, indentLevel?: number) {
        this.output += this.indentStr + generateIndent(indentLevel) + '  ' + str + '\n';
    }

    printEmptyLn() {
        this.output += '\n';
    }

    getOutput(): string {
        return this.output;
    }
}


function generateIndent(indentLevel: number): string {
    let indent = '';
    for (let i = 0; i < indentLevel; i++) {
        indent += '    ';
    }
    return indent;
}