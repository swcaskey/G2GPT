// Puppeteer Environment Setup for Cucumber
// Configures browser automation for BDD acceptance tests

const { BeforeAll, AfterAll, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const readline = require('readline');

// Keep acceptance suite under ~2 minutes with mocked LLM/model endpoints.
setDefaultTimeout(90000);

let browser;
let serverProcess;
let runHeaded = false;

// Enable LLM mocking for faster tests (set to 'false' for real integration tests)
const MOCK_LLM = process.env.MOCK_LLM !== 'false';

function parseYesNo(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (['y', 'yes', 'true', '1'].includes(normalized)) return true;
  if (['n', 'no', 'false', '0'].includes(normalized)) return false;
  return null;
}

async function shouldRunHeaded() {
  const envChoice = parseYesNo(process.env.CUCUMBER_HEADED);
  if (envChoice !== null) {
    return envChoice;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return false;
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Run Cucumber with visible browser window? (Y/N): ', (answer) => {
      const choice = parseYesNo(answer);
      rl.close();
      resolve(choice === true);
    });
  });
}

// Launch server and browser once before all scenarios
BeforeAll(async function () {
  runHeaded = await shouldRunHeaded();

  // Start the Express server
  serverProcess = spawn('node', ['server.js'], {
    stdio: 'ignore',
    detached: false
  });

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  browser = await puppeteer.launch({
    headless: !runHeaded,
    slowMo: runHeaded ? 25 : 0,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
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
    // Override fetch to intercept model/chat endpoints with instant mocks
    await this.page.evaluateOnNewDocument(() => {
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const [resource, config] = args;
        
        // Mock available model list for deterministic selector tests
        if (typeof resource === 'string' && resource.includes('/api/models')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                models: ['llama3', 'mistral']
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }

        // Mock /api/chat endpoint with per-model responses
        if (typeof resource === 'string' && resource.includes('/api/chat')) {
          let selectedModels = ['llama3'];
          try {
            const payload = config && config.body ? JSON.parse(config.body) : {};
            if (Array.isArray(payload.models) && payload.models.length > 0) {
              selectedModels = payload.models;
            }
          } catch (err) {
            selectedModels = ['llama3'];
          }

          const responses = selectedModels.map((modelName) => ({
            model: modelName,
            content: `Mocked AI response from ${modelName}.`
          }));

          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                responses
              }),
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
