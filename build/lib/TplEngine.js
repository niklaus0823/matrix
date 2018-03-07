"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LibFs = require("fs");
const LibPath = require("path");
const handlebars = require("handlebars");
const helpers = require("handlebars-helpers");
const TPL_BASE_PATH = LibPath.join(__dirname, '..', '..', 'template');
helpers({ handlebars: handlebars });
handlebars.registerHelper('curlyLeft', () => '{');
handlebars.registerHelper('curlyRight', () => '}');
exports.registerHelper = (name, fn, inverse) => {
    handlebars.registerHelper(name, fn, inverse);
};
exports.render = (templateName, params) => exports.compile(templateName)(params);
exports.compile = (templateName) => handlebars.compile(LibFs.readFileSync(`${LibPath.join(TPL_BASE_PATH, templateName)}.hbs`).toString());
