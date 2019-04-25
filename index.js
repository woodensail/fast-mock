#!/usr/bin/env node

const AnyProxy = require('anyproxy');
const co = require('co');
const fs = require('fs');
const inquirer = require('inquirer');
const child_process = require('child_process');
const path = require('path');
const mime = require('mime');
const _ = require('lodash');
const _config = require('./config');

const result = AnyProxy.utils.certMgr.ifRootCAFileExists();
const defaults = {
  mockDir: null,
  align: {
    doc: 'community/develop/doc'
  }
};

function start() {
  console.log(__dirname);
  co(function* () {
    const cfg = yield (_config.getConfig());
    console.log(cfg);
    if (cfg) {
      _start(cfg);
    }
  });

}

module.exports.start = start;


function _start(config) {
  config.alignArr = _.toPairs(config.align);
  const options = {
    port: 8001,
    rule: {
      summary: '',
      // * beforeDealHttpsRequest(requestDetail) {
      //   return true;
      // },
      * beforeSendRequest(requestDetail) {
        const originPath = requestDetail.requestOptions.path.split(/[?#]/)[0].substr(1);
        let mappedPath = originPath;
        config.alignArr.find(([key, pattern]) => {
            if (originPath.startsWith(pattern)) {
              mappedPath = originPath.replace(pattern, key);
              return true;
            }
          }
        );
        const dirs = mappedPath.split('/').filter(x => x);
        const action = dirs.splice(-1)[0];
        return new Promise(function (resolve) {
          fs.readdir(path.join(config.mockDir, ...dirs), function (err, files) {
            if (err) {
              resolve(null);
              return;
            }
            const file = files.find(file => path.parse(file).name === action);
            if (file) {
              const data = fs.readFileSync(path.join(config.mockDir, ...dirs, file));
              const ext = path.extname(file);
              resolve({
                response: {
                  statusCode: 200,
                  header: {'content-type': mime.getType(file)},
                  body: data
                }
              });
            } else {
              resolve(null);
            }
          });
        });
      },
    },
    webInterface: {
      enable: true,
      webPort: 8002
    },
    // throttle: 10000,
    forceProxyHttps: config.https,
    wsIntercept: false, // 不开启websocket代理
    silent: false
  };
  const proxyServer = new AnyProxy.ProxyServer(options);

  proxyServer.on('ready', () => { /* */ });
  proxyServer.on('error', (e) => { /* */ });
  AnyProxy.utils.systemProxyMgr.enableGlobalProxy('127.0.0.1', '8001');
  refreshInternet();
  proxyServer.start();

  process.on('SIGINT', function () {
    console.log('Exit now!');
    AnyProxy.utils.systemProxyMgr.disableGlobalProxy();
    refreshInternet();
    process.exit();
  });
}

function refreshInternet() {
  try {
    if (/^win/.test(process.platform)) {
      child_process.execSync(`\"${path.join(__dirname, './bin/refresh.exe')}\"`);
    }
  } catch (ignored) {
  }
}

// const promptList = [
//   {
//     type: 'confirm',
//     message: '即将进行 ' + `${mode} ${env}`.yellow + ' 环境编译，确认？',
//     name: 'result',
//     prefix: '?',
//     default: 'y'
//   },
//   {
//     when: function (answers) {
//       return answers.result;
//     },
//     type: 'list',
//     message: '请选择编译小程序的类型',
//     name: 'buildType',
//     choices: choices,
//     prefix: '?',
//     default: 0,
//     validate: function (input) {
//       var done = this.async();
//       if (input == 0) {
//         done('请选择支持的类型');
//         return;
//       }
//       done(null, true);
//     }
//   },
//   {
//     when: function (answers) {
//       return answers.buildType == '1';  // 主小程序需要选择业务类型
//     },
//     type: 'list',
//     message: '请选择业务类型',
//     name: 'busType',
//     choices: [{
//       name: '商超',
//       value: 1
//     },
//       {
//         name: '宝宝店',
//         value: 2
//       }],
//     prefix: '?',
//     default: 0,
//     validate: function (input) {
//       var done = this.async();
//       if (input == 0) {
//         done('请选择业务类型');
//         return;
//       }
//       done(null, true);
//     }
//   },
//   {
//     when: function (answers) {
//       return answers.result;
//     },
//     type: 'input',
//     message: '请输入需要发布的appId：',
//     name: 'appId',
//     // default: defaultAppids[buildType],
//     default: function (answers) {
//       return defaultAppids[answers.buildType];
//     },
//     prefix: '?',
//     validate: function (input) {
//       var done = this.async();
//       if (!/^wx.*/.test(input)) {
//         done('请输入规范的appId');
//         return;
//       }
//       done(null, true);
//     }
//   },
//   {
//     when: function (answers) {
//       return answers.result;
//     },
//     type: 'input',
//     message: '请输入需要发布的版本：',
//     default: '1.0.0',
//     name: 'version',
//     prefix: '?',
//     validate: function (input) {
//       var done = this.async();
//       if (!/^\d+\.\d+\.\d+$/.test(input)) {
//         done('请输入规范的版本号，如 1.0.2');
//         return;
//       }
//       done(null, true);
//     }
//   }
// ];

// inquirer.prompt(promptList)
