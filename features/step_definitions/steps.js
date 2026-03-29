// Cucumber Step Definitions for Authentication Feature
// Defines the Given/When/Then steps for BDD scenarios

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

const baseUrl = 'http://localhost:3000';

// Shared state between scenarios
let sharedUsername = 'tarun123';
let sharedPassword = 'rutgers2026';

// ==================== Scenario: Landing Page Access ====================

Given('I am not logged in', async function () {
  await this.page.goto(baseUrl);
});

When('I visit the application home page', async function () {
  await this.page.goto(baseUrl);
});

Then('I should see the landing page with options to create an account or log in', async function () {
  const title = await this.page.title();
  assert.strictEqual(title, 'G2GPT - Home');
  
  // Highlight buttons for visual demonstration
  await this.page.evaluate(() => {
    const signupBtn = document.querySelector('.btn[href="/signup"]');
    if (signupBtn) signupBtn.classList.add('automated-highlight');
  });
  
  const signupLink = await this.page.$('.btn[href="/signup"]');
  const loginLink = await this.page.$('.btn[href="/login"]');
  
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
  sharedUsername = `newuser${timestamp}`;
  
  await this.page.type('#signupName', `Test User ${timestamp}`, { delay: 5 });
  await this.page.type('#signupUsername', sharedUsername, { delay: 5 });
  await this.page.type('#signupPassword', sharedPassword, { delay: 5 });
  
  // Highlight submit button before clicking
  await this.page.evaluate(() => {
    const btn = document.querySelector('#signupForm button');
    if (btn) btn.classList.add('automated-highlight');
  });
  await new Promise(r => setTimeout(r, 2000));

  await Promise.all([
    this.page.click('#signupForm button')
  ]);

  // Wait for the login page to appear (redirect happens after 1s)
  await this.page.waitForSelector('h1', { visible: true });
  
  // Verify we are on the login page
  const loginTitle = await this.page.$eval('h1', el => el.textContent);
  assert.ok(loginTitle.includes('Login'), 'Did not redirect to Login page');
});

Then('my account should be created and I should be able to log in', async function () {
  const title = await this.page.title();
  assert.strictEqual(title, 'Rutgers Login');
});

// ==================== Scenario: Local Log In and Log Out ====================

Given('I already have an account', async function () {
  await this.page.goto(`${baseUrl}/login`);
});

When('I enter valid Log In credentials', async function () {
  await this.page.type('#uname', sharedUsername, { delay: 5 });
  await this.page.type('#psw', sharedPassword, { delay: 5 });
  
  // Highlight login button
  await this.page.evaluate(() => {
    const btn = document.querySelector('#loginForm button[type="submit"]');
    if (btn) btn.classList.add('automated-highlight');
  });
  await new Promise(r => setTimeout(r, 2000));

  await Promise.all([
    this.page.click('#loginForm button[type="submit"]')
  ]);

  // Wait for the Dashboard to appear
  await this.page.waitForSelector('.card h1', { visible: true });
});

Then('I should be signed in to the application', async function () {
  const title = await this.page.title();
  assert.strictEqual(title, 'G2GPT - Dashboard');
  
  const authStatus = await this.page.$eval('#auth-status', el => el.textContent);
  assert.strictEqual(authStatus, 'You are now securely logged in.');
});

Then('when I click log out and confirm, I should return to a non-authenticated state', async function () {
  // Highlight and click log out
  await this.page.evaluate(() => {
    document.getElementById('logout-link').classList.add('automated-highlight');
  });
  await new Promise(r => setTimeout(r, 2000));

  await Promise.all([
    this.page.waitForNavigation(),
    this.page.click('#logout-link')
  ]);
  
  // Verify we are on log out confirmation page
  let title = await this.page.title();
  assert.strictEqual(title, 'Log Out');
  
  // Highlight and confirm log out
  await this.page.evaluate(() => {
    document.getElementById('confirm-yes').classList.add('automated-highlight');
  });
  await new Promise(r => setTimeout(r, 2000));

  await Promise.all([
    this.page.waitForNavigation(),
    this.page.click('#confirm-yes')
  ]);
  
  // Verify we are back on landing page
  title = await this.page.title();
  assert.strictEqual(title, 'G2GPT - Home');
});

