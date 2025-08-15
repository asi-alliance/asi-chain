const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

exports.config = {
  user: process.env.LT_USER_NAME,  // LambdaTest username
  key: process.env.LT_ACCESS_KEY,  // LambdaTest access key
  hostname: 'hub.lambdatest.com',
  port: 443,
  path: '/wd/hub',
  protocol: 'https',

  specs: ['./TestSuites/**/*.js'],  // Path to test files
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
      // IMPORTANT: Add timeouts for LambdaTest
      idleTimeout: 900,      // 15 minutes idle timeout
      commandTimeout: 900,   // 15 minutes command timeout
      video: true,           // Video recording for debugging
      network: true,         // Network logs for debugging
    }
  }],

  logLevel: 'info',
  bail: 0,

  baseUrl: 'http://184.73.0.34:3000',  // ASI Wallet URL
  waitforTimeout: 10000,
  connectionRetryTimeout: 900000,  // 15 minutes
  connectionRetryCount: 3,

  services: ['lambdatest'],

  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 900000  // FIXED: 15 minutes instead of 1 minute
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
