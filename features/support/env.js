// Puppeteer Environment Setup for Cucumber
// Configures browser automation for BDD acceptance tests

const { BeforeAll, AfterAll, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

// Set timeout to 120 seconds for Iteration 2 tests
setDefaultTimeout(120000);

let browser;
let serverProcess;

// Enable LLM mocking for faster tests
const MOCK_LLM = process.env.MOCK_LLM !== 'false';

// Launch server and browser once before all scenarios
BeforeAll(async function () {
  serverProcess = spawn('node', ['server.js'], {
    stdio: 'ignore',
    detached: false
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  browser = await puppeteer.launch({
    headless: false,
    slowMo: 25
  });
});

// Close browser and server after all scenarios
AfterAll(async function () {
  if (browser) {
    const pages = await browser.pages();
    for (const page of pages) {
      try {
        if (!page.isClosed()) {
          await page.close();
        }
      } catch (err) {
        // ignore cleanup errors
      }
    }

    try {
      await browser.close();
    } catch (err) {
      // ignore cleanup errors
    }
  }

  if (serverProcess) {
    serverProcess.kill();
  }
});

// Create new page before each scenario
Before(async function () {
  this.browser = browser;
  this.page = await browser.newPage();

  await this.page.setViewport({ width: 1280, height: 800 });

  if (MOCK_LLM) {
    await this.page.evaluateOnNewDocument(() => {
      const originalFetch = window.fetch.bind(window);

      window.fetch = function(...args) {
        const [resource] = args;
        const url = typeof resource === 'string' ? resource : resource?.url || '';

        // Mock multi-model endpoint
        if (url.includes('/api/chat-multi')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                responses: [
                  {
                    model: 'mock-model-1',
                    success: true,
                    reply: 'Mocked response from model 1.'
                  },
                  {
                    model: 'mock-model-2',
                    success: true,
                    reply: 'Mocked response from model 2.'
                  },
                  {
                    model: 'mock-model-3',
                    success: true,
                    reply: 'Mocked response from model 3.'
                  }
                ]
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              }
            )
          );
        }

        // Mock single-model endpoint too
        if (url.includes('/api/chat')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                reply: 'Mocked AI response for testing. Real LLM would respond here.'
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              }
            )
          );
        }

        // Mock models list so checkbox UI always loads in tests
        if (url.includes('/api/models')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                models: [
                  { name: 'mock-model-1' },
                  { name: 'mock-model-2' },
                  { name: 'mock-model-3' }
                ]
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              }
            )
          );
        }

        return originalFetch(...args);
      };
    });
  }
});

// Close page after each scenario
After(async function () {
  if (this.page && !this.page.isClosed()) {
    try {
      await this.page.close();
    } catch (err) {
      // ignore cleanup errors
    }
  }
});