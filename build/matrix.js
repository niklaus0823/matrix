#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const pkg = require('../package.json');
program.version(pkg.version)
    .command('proto [options]', 'generate node.js source codes from proto files')
    .command('grpc [options]', 'generate grpc server/ grpc client/ gateway server stubs from proto files')
    .parse(process.argv);
