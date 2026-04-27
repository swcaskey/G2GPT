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

// Helper function to setup LLM mocking
async function setupLLMMocking(page) {
  if (!MOCK_LLM) return;
  
  await page.evaluate(() => {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const [resource, init] = args;
      console.log('[MOCK] Fetch intercepted:', resource);
      
      // Mock the /api/chat and /api/chat/multi endpoints for faster tests
      if (typeof resource === 'string' && (resource.includes('/api/chat/multi') || resource.includes('/api/chat'))) {
        console.log('[MOCK] Mocking LLM endpoint:', resource);
        // Parse the request body to determine how many models were selected
        let numModels = 1;
        if (init && init.body) {
          try {
            const body = JSON.parse(init.body);
            console.log('[MOCK] Request body:', body);
            numModels = (body.modelNames && body.modelNames.length) || 1;
            console.log('[MOCK] Number of models:', numModels);
          } catch (e) {
            console.log('[MOCK] Failed to parse body:', e);
            numModels = 1;
          }
        }
        
        // Create mock replies for each model
        const mockReplies = [];
        for (let i = 0; i < numModels; i++) {
          mockReplies.push({
            model: `mock-model-${i + 1}`,
            content: 'This is a mocked response for testing purposes.',
            error: false
          });
        }
        
        const responseBody = {
          success: true,
          replies: mockReplies
        };
        console.log('[MOCK] Returning mock response:', JSON.stringify(responseBody));
        const response = new Response(JSON.stringify(responseBody), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('[MOCK] Response OK:', response.ok);
        return Promise.resolve(response);
      }
      
      // Use real fetch for all other endpoints
      console.log('[MOCK] Using real fetch for:', resource);
      return originalFetch.apply(this, args);
    };
  });
}

// Create new page before each scenario
Before(async function () {
  this.browser = browser;
  this.page = await browser.newPage();
  
  // Set viewport for consistent testing
  await this.page.setViewport({ width: 1280, height: 800 });
  
  // Setup LLM mocking by injecting a script before any page loads
  if (MOCK_LLM) {
    // This script will run before any other scripts and before any fetch happens
    await this.page.evaluateOnNewDocument(() => {
      window._llmMockReady = true;
      window._llmMockReplies = null;
      
      // Override fetch for /api/chat/multi
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const [resource, init] = args;
        const resourceStr = typeof resource === 'string' ? resource : resource.toString();
        
        if (resourceStr.includes('/api/chat/multi')) {
          let numModels = 1;
          if (init && init.body) {
            try {
              const body = JSON.parse(init.body);
              numModels = (body.modelNames && body.modelNames.length) || 1;
            } catch (e) {
              // ignore
            }
          }
          
          const mockReplies = [];
          for (let i = 0; i < numModels; i++) {
            mockReplies.push({
              model: `mock-model-${i + 1}`,
              content: 'This is a mocked response for testing purposes.',
              error: false
            });
          }
          
          const mockResponse = {
            success: true,
            replies: mockReplies
          };
          
          return new Promise((resolve) => {
            resolve(new Response(JSON.stringify(mockResponse), {
              status: 200,
              statusText: 'OK',
              headers: { 'Content-Type': 'application/json' }
            }));
          });
        }
        
        // For all other endpoints, use the original fetch
        return originalFetch.apply(this, args);
      };
    });
  }
  
  // Store setupLLMMocking function on page for later use
  this.setupLLMMocking = () => setupLLMMocking(this.page);
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
