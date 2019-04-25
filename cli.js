#!/usr/bin/env node

var program = require('commander');
var PKG = require('./package.json');
const fastMock = require('./index');

program
  .version(PKG.version)
  .option('-T, --no-tests', 'ignore test hook');

program
  .command('start')
  .description('start service')
  .alias('S')
  .action(function (type, name) {
    fastMock.start();
  });

program
  .parse(process.argv);


if (process.argv.length === 2) {
  program.outputHelp();
}
