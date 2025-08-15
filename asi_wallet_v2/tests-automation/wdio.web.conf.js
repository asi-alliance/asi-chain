const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

exports.config = {
  user: process.env.LT_USER_NAME, // твой логин от LambdaTest
  key: process.env.LT_ACCESS_KEY, // твой ключ от LambdaTest
  hostname: 'hub.lambdatest.com',
  port: 443,
  path: '/wd/hub',
  protocol: 'https',

  specs: ['./TestSuites/**/*.js'], // путь к тестам
  exclude: [],

  maxInstances: 1,

  capabilities: [{
    browserName: 'Chrome',
    browserVersion: 'latest',
    'LT:Options': {
      console: true,
      platformName: 'Windows 11',
      build: 'ASI Wallet Tests',
      name: 'Create + Import + Validate Balance',
    }
  }],

  logLevel: 'info',
  bail: 0,

  baseUrl: 'http://184.73.0.34:3000', // твой ASI Wallet
  waitforTimeout: 10000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 3,

  services: ['lambdatest'],

  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 60000
  },

  afterTest: async function (test, context, { error }) {
    try {
      const status = error ? 'failed' : 'passed';
      await browser.executeScript(`lambda-status=${status}`, []);
      console.log(`🔁 Sent LambdaTest status: ${status}`);
    } catch (err) {
      console.error('❗ LambdaTest status update failed:', err.message);
    }
    await browser.pause(1000);
  }
};
