#!/usr/bin/env node
import * as program from 'commander';

const pkg = require('../package.json');

program.version(pkg.version)
    .command('proto [options]', 'generate node.js source codes from proto files')
    .command('grpc [options]', 'generate grpc server/ grpc client/ gateway server stubs from proto files')
    .parse(process.argv);