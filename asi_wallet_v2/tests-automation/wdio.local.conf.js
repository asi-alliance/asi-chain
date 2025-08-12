require('dotenv').config();

exports.config = {
  user: process.env.LT_USER_NAME,
  key: process.env.LT_ACCESS_KEY,

  hostname: 'hub.lambdatest.com',
  port: 443,
  path: '/wd/hub',
  protocol: 'https',

  specs: ['./TestSuites/**/*.js'],
  exclude: [],

  maxInstances: 1,

  capabilities: [{
    browserName: 'Chrome',
    browserVersion: 'latest',
  }],

  logLevel: 'info',
  bail: 0,
  baseUrl: 'http://localhost:3000',
  waitforTimeout: 10000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 3,
  

  services: ["lambdatest"],

  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000
  },
  afterTest: async function (test, context, { error }) {
    try {
      const status = error ? 'failed' : 'passed';
      await browser.execute(`lambda-status=${status}`);
      console.log(`🔁 Sent LambdaTest status: ${status}`);
    } catch (err) {
      console.error('❗ LambdaTest status update failed:', err.message);
    }
    await browser.pause(1000);
  }
};
