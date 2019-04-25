const fs = require('fs');
const inquirer = require('inquirer');
const AnyProxy = require('anyproxy');
const exec = require('child_process').exec;

const configFile = 'fast-mock.json';
const defaults = {
  mockDir: 'mock',
  https: true,
  localCert: true,
  // align: {
  //   doc: 'community/develop/doc'
  // }
};

function* getConfig() {
  let currentConfig;
  if (!fs.existsSync(configFile)) {
    const promptList = [
      {
        type: 'list',
        message: '未在当前目录找到配置文件，选择初始化方式:',
        name: 'init',
        choices: [{name: '使用默认配置', value: 0},
          {name: '跟据引导选择配置', value: 1},
          {name: '退出', value: -1}],
        // prefix: '?',
        default: 'y'
      }];
    const result = yield inquirer.prompt(promptList);
    if (result.init === -1) {
      return false;
    } else if (result.init === 0) {
      fs.writeFileSync(configFile, JSON.stringify(defaults, null, 2), {flag: 'w'});
      currentConfig = defaults;
    } else if (result.init === 1) {
      const userConfig = yield initGuild();
      const config = Object.assign({}, defaults, userConfig);
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2), {flag: 'w'});
      currentConfig = config;
    }

  } else {
    currentConfig = Object.assign({}, defaults, JSON.parse(fs.readFileSync(configFile)));
  }

  if (currentConfig.localCert) {
    console.log('cert');
    console.log(AnyProxy.utils.certMgr.ifRootCAFileExists());
    yield checkCert();
  }

  return currentConfig;
}

function* checkCert() {

  const certMgr = AnyProxy.utils.certMgr;
  if (!certMgr.ifRootCAFileExists()) {
    console.log('cert111');
    certMgr.generateRootCA((error, keyPath) => {
      // let users to trust this CA before using proxy
      if (!error) {
        const certDir = require('path').dirname(keyPath);
        console.log('The cert is generated at', certDir);
        trustCert(certDir);
      } else {
        console.error('error when generating rootCA', error);
      }
    });
  } else {
    // const trusted = yield certMgr.ifRootCATrusted;
    // console.log('trusted', trusted);
    // if (!trusted) {
    //   trustCert(certMgr.getRootDirPath());
    // }
  }
}

function trustCert(certDir) {
  const isWin = /^win/.test(process.platform);
  if (isWin) {
    exec('start .', {cwd: certDir});
  } else {
    exec('open .', {cwd: certDir});
  }
}

function* initGuild() {
  const promptList = [
    {
      message: '请输入mock文件夹位置',
      name: 'mockDir',
      // prefix: '?',
      type: 'input',
      default: 'mock'
    }, {
      message: '是否拦截https请求？',
      name: 'https',
      // prefix: '?',
      type: 'confirm',
      default: 'y'
    }, {
      when(res) {
        return res.https;
      },
      message: '是否安装证书(用于拦截本机发出的https请求)？',
      name: 'localCert',
      // prefix: '?',
      type: 'confirm',
      default: 'y'
    }];
  const result = yield inquirer.prompt(promptList);
  const config = Object.assign({}, defaults, {
    mockDir: result.mockDir,
    https: result.https,
    localCert: result.localCert
  });
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2), config, 'w');
  return config;
}


module.exports.getConfig = getConfig;
