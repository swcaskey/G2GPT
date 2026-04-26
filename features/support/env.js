// Puppeteer Environment Setup for Cucumber
// Configures browser automation for BDD acceptance tests

const { BeforeAll, AfterAll, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

// Set timeout to 120 seconds for Iteration 2 tests
// With pre-seeded users + LLM mocking, tests typically complete in 40-60 seconds
setDefaultTimeout(120000);

let browser;
let serverProcess;

// Enable LLM mocking for faster tests (set to 'false' for real integration tests)
const MOCK_LLM = process.env.MOCK_LLM !== 'false';

// Launch server and browser once before all scenarios
BeforeAll(async function () {
  // Start the Express server
  serverProcess = spawn('node', ['server.js'], {
    stdio: 'ignore',
    detached: false
  });

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 500));

  browser = await puppeteer.launch({
    headless: process.env.HEADLESS !== 'false',
    slowMo: process.env.SLOWMO ? parseInt(process.env.SLOWMO) : 0
  });
});

// Close browser and server after all scenarios
AfterAll(async function () {
  // Close all pages first
  if (browser) {
    const pages = await browser.pages();
    for (const page of pages) {
      try {
        if (!page.isClosed()) {
          await page.close();
        }
      } catch (err) {
        // Silently ignore errors during cleanup
      }
    }
    
    // Close browser
    try {
      await browser.close();
    } catch (err) {
      // Silently ignore errors during cleanup
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
  
  // Setup LLM mocking if enabled
  if (MOCK_LLM) {
    // Override fetch to intercept /api/chat calls with instant mocks
    await this.page.evaluateOnNewDocument(() => {
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const [resource] = args;
        
        // Mock the /api/chat endpoints for faster tests
        if (typeof resource === 'string' && resource.includes('/api/chat')) {
          const isMulti = resource.includes('/multi');
          const mockBody = isMulti 
            ? JSON.stringify({
                success: true,
                replies: [
                  { model: 'mock-llama3', content: 'Mocked response from Llama3', error: false },
                  { model: 'mock-mistral', content: 'Mocked response from Mistral', error: false }
                ]
              })
            : JSON.stringify({
                success: true,
                response: 'Mocked AI response for testing.'
              });

          return Promise.resolve(
            new Response(
              mockBody,
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        
        // Use real fetch for all other endpoints
        return originalFetch.apply(this, args);
      };
    });
  }
});

// Close page after each scenario
After(async function () {
  // Close the page to prevent tab accumulation
  if (this.page && !this.page.isClosed()) {
    try {
      await this.page.close();
    } catch (err) {
      // Silently ignore errors during cleanup (page may already be closed)
    }
  }
});
