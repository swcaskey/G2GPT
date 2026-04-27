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
        
        // Mock the /api/chat endpoint for faster tests
if (typeof resource === 'string' && resource.includes('/api/chat')) {
  const requestOptions = args[1] || {};
  let requestBody = {};

  try {
    requestBody = JSON.parse(requestOptions.body || '{}');
  } catch (error) {
    requestBody = {};
  }

  const selectedModels = requestBody.models || ['llama3.2', 'misqwen2.5:0.5btral', 'phi3'];
  const messages = requestBody.messages || [];
  const lastUserMessage =
    messages.length > 0
      ? messages[messages.length - 1].content.trim()
      : 'your message';

  function buildReply(model, prompt) {
  const lower = prompt.toLowerCase();

    // --- SIMPLE MATH HANDLER ---
  const mathCheck = prompt.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/x])\s*(-?\d+(?:\.\d+)?)/i);

  if (mathCheck) {
    const a = Number(mathCheck[1]);
    const operator = mathCheck[2].toLowerCase();
    const b = Number(mathCheck[3]);

    let result;

    if (operator === "+") result = a + b;
    else if (operator === "-") result = a - b;
    else if (operator === "*" || operator === "x") result = a * b;
    else if (operator === "/") result = b === 0 ? "undefined because division by zero is not allowed" : a / b;

    if (model === "llama3.2") {
      return `The answer is ${result}.`;
    }

    if (model === "qwen2.5:0.5b") {
      return `Let's calculate it step by step: ${a} ${operator} ${b} = ${result}.`;
    }

    if (model === "phi3") {
      return `Answer: ${result}.`;
    }

    return `${result}`;
  }

  if (lower.includes('weather')) {
    if (model === 'llama3.2') {
      return 'I cannot access live weather in this automated test, but I can still answer the request directly: normally I would give the current temperature, conditions, and short forecast.';
    }
    if (model === 'qwen2.5:0.5b') {
      return 'For a weather question, I would normally provide a fuller forecast summary, including current conditions, expected changes, and any important warnings.';
    }
    return 'Weather check: live data is disabled in this test, but the expected response would be a concise forecast with temperature and conditions.';
  }

  if (lower.includes('rome')) {
    if (model === 'llama3.2') {
      return 'The fall of Rome was mainly caused by political instability, economic decline, military weakness, and outside invasions.';
    }
    if (model === 'qwen2.5:0.5b') {
      return 'Rome fell because several long-term pressures built up together: unstable leadership, financial strain, reliance on mercenaries, administrative division, and repeated invasions.';
    }
    return 'Short answer: Rome declined because its government, economy, army, and borders all weakened over time.';
  }

  if (lower.includes('hello') || lower.includes('hi')) {
    if (model === 'llama3.2') {
      return 'Hello! I am ready to help with your question.';
    }
    if (model === 'qwen2.5:0.5b') {
      return 'Hi! I can help you think through the problem step by step.';
    }
    return 'Hey! Send me what you want help with.';
  }

  if (lower.includes('explain')) {
    if (model === 'llama3.2') {
      return `I can explain "${prompt}" in simple terms by focusing on the main idea first.`;
    }
    if (model === 'qwen2.5:0.5b') {
      return `I would explain "${prompt}" by giving context, breaking it into parts, and then summarizing the key takeaway.`;
    }
    return `Quick explanation: I would simplify "${prompt}" into the most important points.`;
  }

  if (prompt.endsWith('?')) {
    if (model === 'llama3.2') {
      return `My direct answer to "${prompt}" would focus on the main facts.`;
    }
    if (model === 'qwen2.5:0.5b') {
      return `That question deserves a more detailed answer. I would explain the background, reasoning, and conclusion for "${prompt}".`;
    }
    return `Concise answer: I would respond to "${prompt}" with the shortest useful explanation.`;
  }

  if (model === 'llama3.2') {
    return `I understand your statement: "${prompt}". I would respond clearly and directly.`;
  }
  if (model === 'qwen2.5:0.5b') {
    return `You said: "${prompt}". I would build on that with a more detailed and thoughtful response.`;
  }
  return `Got it: "${prompt}". I would keep my response brief and practical.`;
}

  const responses = selectedModels.map((model) => ({
    model,
    content: buildReply(model, lastUserMessage)
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
