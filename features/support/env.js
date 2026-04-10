// Puppeteer Environment Setup for Cucumber
// Configures browser automation for BDD acceptance tests

const { BeforeAll, AfterAll, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

// Set timeout to 90 seconds for Iteration 2 tests (need time for LLM responses)
// Individual steps may wait up to 60 seconds for LLM, but overall 90s timeout for the step itself
setDefaultTimeout(90000);

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
    slowMo: 25  // Reduced from 50ms for faster test execution
  });
});

// Close browser and server after all scenarios
AfterAll(async function () {
  // Close all pages first
  if (browser) {
    const pages = await browser.pages();
    for (const page of pages) {
      try {
        await page.close();
      } catch (err) {
        console.log('Error closing page:', err.message);
      }
    }
    
    // Close browser
    try {
      await browser.close();
    } catch (err) {
      console.log('Error closing browser:', err.message);
    }
  }

  // Stop the server
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Create new page before each scenario
Before(async function () {
  this.browser = browser;
  this.page = await browser.newPage();
  
  // Set viewport for consistent testing
  await this.page.setViewport({ width: 1280, height: 800 });
});

// Close page after each scenario
After(async function () {
  // Close the page to prevent tab accumulation
  if (this.page) {
    try {
      await this.page.close();
    } catch (err) {
      console.log('Error closing page:', err.message);
    }
  }
});

