#!/usr/bin/env node
import * as program from 'commander';

const pkg = require('../package.json');

program.version(pkg.version)
    .command('proto [options]', 'generate node.js source codes from proto files')
    .parse(process.argv);