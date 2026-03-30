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
  await this.page.type('#signupEmail', sharedEmail, { delay: 5 });
  await this.page.type('#signupPassword', sharedPassword, { delay: 5 });
  await this.page.type('#signupConfirmPassword', sharedPassword, { delay: 5 });
  
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
  await this.page.type('#loginEmail', sharedEmail, { delay: 5 });
  await this.page.type('#loginPassword', sharedPassword, { delay: 5 });
  
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

