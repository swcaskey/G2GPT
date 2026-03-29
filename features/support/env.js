// Puppeteer Environment Setup for Cucumber
// Configures browser automation for BDD acceptance tests

const { BeforeAll, AfterAll, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');

// Set timeout to 60 seconds for slow typing demonstrations
setDefaultTimeout(60000);

let browser;

// Launch browser once before all scenarios
BeforeAll(async function () {
  browser = await puppeteer.launch({
    headless: false,
    slowMo: 50 
  });
});

// Close browser after all scenarios
AfterAll(async function () {
  // Browser.close() disabled for manual testing/review
  // Uncomment to enable automatic browser closure:
  // if (browser) {
  //   await browser.close();
  // }
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

