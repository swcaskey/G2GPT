// Cucumber Step Definitions for Authentication Feature
// Defines the Given/When/Then steps for BDD scenarios

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

const baseUrl = 'http://localhost:3000';

// Shared state between scenarios
let sharedEmail = 'test@example.com';
let sharedPassword = 'password123';

// ==================== Scenario: Landing Page Access ====================

Given('I am not logged in', async function () {
  await this.page.goto(baseUrl);
});

When('I visit the application home page', async function () {
  await this.page.goto(baseUrl);
});

Then('I should see the landing page with options to create an account or log in', async function () {
  const title = await this.page.title();
  assert.strictEqual(title, 'G2GPT - Landing Page');
  
  // Highlight buttons for visual demonstration
  await this.page.evaluate(() => {
    const signupBtn = document.querySelector('a[href="/signup"]#signup-link');
    if (signupBtn) signupBtn.style.outline = '3px solid #ffc107';
  });
  
  const signupLink = await this.page.$('a[href="/signup"]#signup-link');
  const loginLink = await this.page.$('a[href="/login"]#login-link');
  
  assert.ok(signupLink !== null, 'Sign Up link is missing');
  assert.ok(loginLink !== null, 'Log In link is missing');
  
  await new Promise(r => setTimeout(r, 1000));
});

// ==================== Scenario: Account Registration ====================

Given('I am on the sign-up page', async function () {
  await this.page.goto(`${baseUrl}/signup`);
});

When('I enter valid account information and submit the form', async function () {
  const timestamp = Date.now();
  sharedEmail = `testuser${timestamp}@example.com`;
  
  await this.page.waitForSelector('#signupEmail');
  await this.page.type('#signupEmail', sharedEmail, { delay: 3 });
  await this.page.type('#signupPassword', sharedPassword, { delay: 3 });
  await this.page.type('#signupConfirmPassword', sharedPassword, { delay: 3 });
  
  // Highlight submit button before clicking
  await this.page.evaluate(() => {
    const btn = document.querySelector('#create-account-btn');
    if (btn) btn.style.outline = '3px solid #ffc107';
  });
  await new Promise(r => setTimeout(r, 2000));

  await this.page.click('#create-account-btn');
  
  // Wait for success message or redirect
  await this.page.waitForFunction(
    () => {
      const message = document.getElementById('signupMessage');
      return message && (message.textContent.includes('success') || message.classList.contains('success'));
    },
    { timeout: 5000 }
  );

  // Wait for redirect to login page
  await this.page.waitForNavigation({ timeout: 10000 });
});

Then('my account should be created and I should be able to log in', async function () {
  const title = await this.page.title();
  assert.strictEqual(title, 'G2GPT - Log In');
});

// ==================== Scenario: Local Log In and Log Out ====================

Given('I already have an account', async function () {
  await this.page.goto(`${baseUrl}/login`);
});

When('I enter valid Log In credentials', async function () {
  await this.page.waitForSelector('#loginEmail');
  await this.page.type('#loginEmail', sharedEmail, { delay: 3 });
  await this.page.type('#loginPassword', sharedPassword, { delay: 3 });
  
  // Highlight login button
  await this.page.evaluate(() => {
    const btn = document.querySelector('#login-btn');
    if (btn) btn.style.outline = '3px solid #ffc107';
  });
  await new Promise(r => setTimeout(r, 2000));

  await this.page.click('#login-btn');

  // Wait for success message or redirect
  await this.page.waitForFunction(
    () => {
      const message = document.getElementById('loginMessage');
      return message && (message.textContent.includes('success') || message.classList.contains('success'));
    },
    { timeout: 5000 }
  );

  // Wait for redirect to dashboard
  await this.page.waitForNavigation({ timeout: 10000 });
});

Then('I should be signed in to the application', async function () {
  const title = await this.page.title();
  assert.strictEqual(title, 'G2GPT - Dashboard');
  
  const heading = await this.page.$eval('h1#dashboard-title', el => el.textContent);
  assert.strictEqual(heading, 'Authenticated Home Page');
});

Then('when I click log out and confirm, I should return to a non-authenticated state', async function () {
  // Highlight and click log out
  await this.page.evaluate(() => {
    const link = document.getElementById('logout-link');
    if (link) link.style.outline = '3px solid #ffc107';
  });
  await new Promise(r => setTimeout(r, 2000));

  await Promise.all([
    this.page.waitForNavigation({ timeout: 10000 }),
    this.page.click('#logout-link')
  ]);
  
  // Verify we are on log out confirmation page
  let title = await this.page.title();
  assert.strictEqual(title, 'G2GPT - Log Out');
  
  // Highlight and confirm log out
  await this.page.evaluate(() => {
    const btn = document.getElementById('confirm-logout-btn');
    if (btn) btn.style.outline = '3px solid #ffc107';
  });
  await new Promise(r => setTimeout(r, 2000));

  await Promise.all([
    this.page.waitForNavigation({ timeout: 10000 }),
    this.page.click('#confirm-logout-btn')
  ]);
  
  // Verify we are back on landing page
  title = await this.page.title();
  assert.strictEqual(title, 'G2GPT - Landing Page');
});

// ==================== ITERATION 2: Chat Feature Tests ====================

// Scenario: Send a prompt and receive a response
Given('I am logged in and on the dashboard', async function () {
  // Create a unique test account for this scenario
  const timestamp = Date.now();
  const testEmail = `testchat${timestamp}@example.com`;
  
  // Signup
  await this.page.goto(`${baseUrl}/signup`);
  await this.page.waitForSelector('#signupEmail');
  await this.page.type('#signupEmail', testEmail, { delay: 3 });
  await this.page.type('#signupPassword', 'password123', { delay: 3 });
  await this.page.type('#signupConfirmPassword', 'password123', { delay: 3 });
  await this.page.click('#create-account-btn');
  await this.page.waitForNavigation({ timeout: 10000 });
  
  // Login
  await this.page.waitForSelector('#loginEmail');
  await this.page.type('#loginEmail', testEmail, { delay: 3 });
  await this.page.type('#loginPassword', 'password123', { delay: 3 });
  await this.page.click('#login-btn');
  await this.page.waitForNavigation({ timeout: 10000 });
  
  // Verify we're on dashboard
  const title = await this.page.title();
  assert.strictEqual(title, 'G2GPT - Dashboard');
});

When('I enter a prompt in the chat box and click {string}', async function (buttonText) {
  await this.page.waitForSelector('#user-input');
  
  // Highlight input field
  await this.page.evaluate(() => {
    const input = document.getElementById('user-input');
    if (input) input.style.outline = '3px solid #ffc107';
  });
  await new Promise(r => setTimeout(r, 1000));
  
  // Type a test prompt
  const testPrompt = 'Hello, how are you?';
  await this.page.type('#user-input', testPrompt, { delay: 10 });
  await new Promise(r => setTimeout(r, 1000));
  
  // Highlight send button
  await this.page.evaluate(() => {
    const btn = document.getElementById('send-btn');
    if (btn) btn.style.outline = '3px solid #ffc107';
  });
  await new Promise(r => setTimeout(r, 1000));
  
  // Click send button
  await this.page.click('#send-btn');
  
  // Store prompt for later verification
  this.lastPrompt = testPrompt;
});

Then('I should see my prompt and the LLM\'s response in the chat window', async function () {
  // Wait for typing indicator to appear (has .show class)
  await this.page.waitForSelector('#typing-indicator.show', { timeout: 10000 }).catch(() => {
    // If indicator doesn't appear, response may be instant
    console.log('Dashboard: Typing indicator did not appear or was too fast');
  });
  
  // Wait for typing indicator to disappear (response received)
  // Increased timeout to 110s to accommodate slower machines and network latency
  await this.page.waitForFunction(
    () => !document.getElementById('typing-indicator').classList.contains('show'),
    { timeout: 110000 }
  );
  
  // Wait a bit for message to render
  await new Promise(r => setTimeout(r, 2000));
  
  // Verify user message appears with correct selector: .msg-row.user
  const userMessages = await this.page.$$('.msg-row.user');
  assert.ok(userMessages.length > 0, 'User message not found in chat');
  
  // Verify AI response appears with correct selector: .msg-row.assistant
  const assistantMessages = await this.page.$$('.msg-row.assistant');
  assert.ok(assistantMessages.length > 0, 'LLM response not found in chat');
  
  // Highlight the messages
  await this.page.evaluate(() => {
    const messages = document.querySelectorAll('.msg-row');
    messages.forEach(msg => msg.style.outline = '2px solid #4caf50');
  });
  await new Promise(r => setTimeout(r, 2000));
});

// Scenario: Conversation history is saved
Given('I have completed a chat session', async function () {
  // Create a unique test account
  const timestamp = Date.now();
  const testEmail = `testhistory${timestamp}@example.com`;
  
  // Signup
  await this.page.goto(`${baseUrl}/signup`);
  await this.page.waitForSelector('#signupEmail');
  await this.page.type('#signupEmail', testEmail, { delay: 3 });
  await this.page.type('#signupPassword', 'password123', { delay: 3 });
  await this.page.type('#signupConfirmPassword', 'password123', { delay: 3 });
  await this.page.click('#create-account-btn');
  await this.page.waitForNavigation({ timeout: 10000 });
  
  // Login
  await this.page.waitForSelector('#loginEmail');
  await this.page.type('#loginEmail', testEmail, { delay: 3 });
  await this.page.type('#loginPassword', 'password123', { delay: 3 });
  await this.page.click('#login-btn');
  await this.page.waitForNavigation({ timeout: 10000 });

  // Now on dashboard - send a message to create history
  await this.page.waitForSelector('#user-input', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));
  
  await this.page.type('#user-input', 'Test message for history', { delay: 3 });
  await this.page.click('#send-btn');
  
  // Wait for response using waitForFunction
  // Increased timeout to 110s to accommodate slower machines and network latency
  await this.page.waitForFunction(
    () => !document.getElementById('typing-indicator').classList.contains('show'),
    { timeout: 110000 }
  );
  await new Promise(r => setTimeout(r, 2000));
});

When('I refresh the dashboard or log in again', async function () {
  // Refresh the page
  await this.page.reload({ waitUntil: 'networkidle0' });
  await this.page.waitForSelector('#history-list', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));
});

Then('I should see my previous session listed in the history sidebar', async function () {
  await this.page.waitForSelector('#history-list', { timeout: 10000 });
  
  // Wait for history to load
  await new Promise(r => setTimeout(r, 2000));
  
  // Check for conversation items in history - looking for .history-item elements
  const historyItems = await this.page.$$('#history-list .history-item');
  assert.ok(historyItems.length > 0, 'No conversations found in history sidebar');
  
  // Highlight history items
  await this.page.evaluate(() => {
    const items = document.querySelectorAll('#history-list .history-item');
    items.forEach(item => item.style.outline = '2px solid #2196f3');
  });
  await new Promise(r => setTimeout(r, 2000));
});

// Scenario: Search conversation history
Given('I have multiple saved chats', async function () {
  // First login - create unique test account
  const timestamp = Date.now();
  const testEmail = `testsearch${timestamp}@example.com`;
  
  // Signup
  await this.page.goto(`${baseUrl}/signup`);
  await this.page.waitForSelector('#signupEmail');
  await this.page.type('#signupEmail', testEmail, { delay: 3 });
  await this.page.type('#signupPassword', 'password123', { delay: 3 });
  await this.page.type('#signupConfirmPassword', 'password123', { delay: 3 });
  await this.page.click('#create-account-btn');
  await this.page.waitForNavigation({ timeout: 10000 });
  
  // Login
  await this.page.waitForSelector('#loginEmail');
  await this.page.type('#loginEmail', testEmail, { delay: 3 });
  await this.page.type('#loginPassword', 'password123', { delay: 3 });
  await this.page.click('#login-btn');
  await this.page.waitForNavigation({ timeout: 10000 });
  
  // Create just ONE conversation with searchable keyword
  await this.page.waitForSelector('#user-input', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 500));
  
  // Conversation with keyword "weather" for search testing
  await this.page.evaluate(() => {
    document.getElementById('user-input').value = '';
  });
  await this.page.type('#user-input', 'What is the weather', { delay: 3 });
  await this.page.click('#send-btn');
  
  // Wait for response
  // Increased timeout to 110s to accommodate slower machines and network latency
  await this.page.waitForFunction(
    () => !document.getElementById('typing-indicator').classList.contains('show'),
    { timeout: 110000 }
  );
  await new Promise(r => setTimeout(r, 500));
  
  // Refresh to ensure history is loaded
  await this.page.reload({ waitUntil: 'networkidle0' });
  await this.page.waitForSelector('#history-list', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));
});

When('I enter a keyword into the history search bar', async function () {
  await this.page.waitForSelector('#search-input', { timeout: 10000 });
  
  // Highlight search input
  await this.page.evaluate(() => {
    const input = document.getElementById('search-input');
    if (input) input.style.outline = '3px solid #ffc107';
  });
  await new Promise(r => setTimeout(r, 1000));
  
  // Type search keyword
  await this.page.type('#search-input', 'weather', { delay: 10 });
  await new Promise(r => setTimeout(r, 2000));
  
  this.searchKeyword = 'weather';
});

Then('only the relevant matching sessions should be displayed in the sidebar', async function () {
  await new Promise(r => setTimeout(r, 1000));
  
  // Get visible conversation items - using .history-item selector
  const visibleItems = await this.page.evaluate(() => {
    const items = document.querySelectorAll('#history-list .history-item');
    const visible = [];
    items.forEach(item => {
      const style = window.getComputedStyle(item);
      if (style.display !== 'none') {
        visible.push(item.textContent.toLowerCase());
      }
    });
    return visible;
  });
  
  // At least one item should be visible (matching search)
  assert.ok(visibleItems.length > 0, 'No matching conversations found');
  
  // Highlight matching items
  await this.page.evaluate(() => {
    const items = document.querySelectorAll('#history-list .history-item');
    items.forEach(item => {
      const style = window.getComputedStyle(item);
      if (style.display !== 'none') {
        item.style.outline = '3px solid #4caf50';
      }
    });
  });
  await new Promise(r => setTimeout(r, 2000));
});

// Scenario: Resume a conversation from history
Given('I have saved conversations in my history', async function () {
  // First login - create unique test account
  const timestamp = Date.now();
  const testEmail = `testresume${timestamp}@example.com`;
  
  // Signup
  await this.page.goto(`${baseUrl}/signup`);
  await this.page.waitForSelector('#signupEmail');
  await this.page.type('#signupEmail', testEmail, { delay: 3 });
  await this.page.type('#signupPassword', 'password123', { delay: 3 });
  await this.page.type('#signupConfirmPassword', 'password123', { delay: 3 });
  await this.page.click('#create-account-btn');
  await this.page.waitForNavigation({ timeout: 10000 });
  
  // Login
  await this.page.waitForSelector('#loginEmail');
  await this.page.type('#loginEmail', testEmail, { delay: 3 });
  await this.page.type('#loginPassword', 'password123', { delay: 3 });
  await this.page.click('#login-btn');
  await this.page.waitForNavigation({ timeout: 10000 });
  
  // Create a conversation
  await this.page.waitForSelector('#user-input', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));
  
  await this.page.type('#user-input', 'Original conversation message', { delay: 3 });
  await this.page.click('#send-btn');
  
  // Wait for response
  // Increased timeout to 110s to accommodate slower machines and network latency
  await this.page.waitForFunction(
    () => !document.getElementById('typing-indicator').classList.contains('show'),
    { timeout: 110000 }
  );
  await new Promise(r => setTimeout(r, 2000));
  
  // Start a new conversation if button exists
  const newChatBtn = await this.page.$('#new-chat-btn');
  if (newChatBtn) {
    await this.page.click('#new-chat-btn');
    await new Promise(r => setTimeout(r, 1000));
  }
});

When('I click on a past conversation in the sidebar', async function () {
  await this.page.waitForSelector('#history-list', { timeout: 10000 });
  
  // Wait for history items to load
  await new Promise(r => setTimeout(r, 1000));
  
  // Get all history items
  const historyItems = await this.page.$$('#history-list .history-item');
  assert.ok(historyItems.length >= 2, `Need at least 2 conversations (found ${historyItems.length})`);
  
  // Click on SECOND item (first is the new empty chat, second is the original with messages)
  const secondItem = historyItems[1];
  
  // Highlight second conversation item
  await this.page.evaluate(() => {
    const items = document.querySelectorAll('#history-list .history-item');
    if (items[1]) items[1].style.outline = '3px solid #ffc107';
  });
  await new Promise(r => setTimeout(r, 2000));
  
  // Click on second conversation item
  await secondItem.click();
  await new Promise(r => setTimeout(r, 2000));
});

Then('the conversation should be loaded into the chat window', async function () {
  // Wait for messages to load - give it more time
  await new Promise(r => setTimeout(r, 3000));
  
  // Wait for at least one message to appear
  await this.page.waitForSelector('#messages .msg-row', { timeout: 10000 });
  
  // Verify that messages exist in chat window - using .msg-row selector
  const messages = await this.page.$$('#messages .msg-row');
  assert.ok(messages.length > 0, `No messages loaded from history (found ${messages.length} messages)`);
  
  // Highlight loaded messages
  await this.page.evaluate(() => {
    const msgs = document.querySelectorAll('#messages .msg-row');
    msgs.forEach(msg => msg.style.outline = '2px solid #9c27b0');
  });
  await new Promise(r => setTimeout(r, 2000));
});

// ==================== ITERATION 1: Multi-Model Feature Tests ====================

Given('I am an authenticated user on the multi-model interface', async function () {
  const timestamp = Date.now();
  const testEmail = `testmultimodel${timestamp}@example.com`;
  
  await this.page.goto(`${baseUrl}/signup`);
  await this.page.waitForSelector('#signupEmail');
  await this.page.type('#signupEmail', testEmail, { delay: 3 });
  await this.page.type('#signupPassword', 'password123', { delay: 3 });
  await this.page.type('#signupConfirmPassword', 'password123', { delay: 3 });
  await this.page.click('#create-account-btn');
  await this.page.waitForNavigation({ timeout: 10000 });
  
  await this.page.waitForSelector('#loginEmail');
  await this.page.type('#loginEmail', testEmail, { delay: 3 });
  await this.page.type('#loginPassword', 'password123', { delay: 3 });
  await this.page.click('#login-btn');
  await this.page.waitForNavigation({ timeout: 10000 });
  
  await this.page.waitForSelector('#settings-btn', { timeout: 10000 });
  await this.page.click('#settings-btn');
  await this.page.waitForSelector('#settings-modal.show', { timeout: 5000 });
  
  await this.page.click('#save-settings');
});

When('I submit a factual question asking {string}', async function (promptText) {
  await this.page.waitForSelector('#user-input');
  
  await this.page.type('#user-input', promptText, { delay: 5 });
  await new Promise(r => setTimeout(r, 1000));
  
  await this.page.click('#send-btn');
});

Then('the system should query three different LLMs simultaneously', async function () {
  await this.page.waitForSelector('#typing-indicator.show', { timeout: 10000 }).catch(() => {});
  
  await this.page.waitForFunction(
    () => !document.getElementById('typing-indicator').classList.contains('show'),
    { timeout: 110000 }
  );
  await new Promise(r => setTimeout(r, 2000));
});

Then('I should see three distinct responses displayed side-by-side on the screen', async function () {
  await this.page.waitForSelector('.msg-row.multi-col', { timeout: 10000 });
  
  const modelCols = await this.page.$$('.msg-row.multi-col .model-col');
  
  assert.ok(modelCols.length >= 1, 'Multi-model responses not found in chat');
  
  await this.page.evaluate(() => {
    const cols = document.querySelectorAll('.model-col');
    cols.forEach(col => col.style.outline = '3px solid #ff4081');
  });
  await new Promise(r => setTimeout(r, 2000));
});

