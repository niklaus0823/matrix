#!/usr/bin/env node
import * as program from 'commander';

const pkg = require('../package.json');

program.version(pkg.version)
    .command('proto [options]', 'generate node.js source codes from proto files')
    .command('service [options]', 'generate grpc service stubs from proto files')
    .command('client [options]', 'generate remote grpc client stubs from proto files')
    .parse(process.argv);