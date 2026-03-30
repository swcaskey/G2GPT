// Puppeteer Environment Setup for Cucumber
// Configures browser automation for BDD acceptance tests

const { BeforeAll, AfterAll, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

// Set timeout to 60 seconds for slow typing demonstrations
setDefaultTimeout(60000);

let browser;
let serverProcess;

// Launch server and browser once before all scenarios
BeforeAll(async function () {
  // Start the Express server
  serverProcess = spawn('node', ['server.js'], {
    stdio: 'ignore',
    detached: false
  });

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  browser = await puppeteer.launch({
    headless: false,
    slowMo: 50 
  });
});

// Close browser and server after all scenarios
AfterAll(async function () {
  // Browser.close() disabled for manual testing/review
  // Uncomment to enable automatic browser closure:
  // if (browser) {
  //   await browser.close();
  // }

  // Stop the server
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Create new page before each scenario
Before(async function () {
  this.browser = browser;
  this.page = await browser.newPage();
});

// Close page after each scenario
After(async function () {
  // Page.close() disabled for manual testing/review
  // Uncomment to enable automatic page closure:
  // if (this.page) {
  //   await this.page.close();
  // }
});

