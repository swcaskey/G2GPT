const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

const baseUrl = 'http://localhost:3000';

// Share state between scenarios
let sharedUsername = 'test';
let sharedPassword = '1234';

// Scenario 1: Landing Page Access
Given('I am not logged in', async function () {
    // Simply starting fresh
    await this.page.goto(baseUrl);
});

When('I visit the application home page', async function () {
    await this.page.goto(baseUrl);
});

Then('I should see the landing page with options to create an account or log in', async function () {
    const title = await this.page.title();
    assert.strictEqual(title, 'G2GPT - Home');

    // Check for "Sign Up" and "Log In" links
    const signupLink = await this.page.$('#signup-link');
    const loginLink = await this.page.$('#login-link');

    assert.ok(signupLink !== null, 'Sign Up link is missing');
    assert.ok(loginLink !== null, 'Log In link is missing');
});

// Scenario 2: Account Registration
Given('I am on the sign-up page', async function () {
    await this.page.goto(`${baseUrl}/signup`);
});

When('I enter valid account information and submit the form', async function () {
    const timestamp = Date.now();


    await this.page.type('#signupName', sharedUsername);
    await this.page.type('#signupUsername', sharedUsername);
    await this.page.type('#signupPassword', sharedPassword);

    await Promise.all([
        this.page.waitForNavigation(),
        this.page.click('#submit-signup')
    ]);
});

Then('my account should be created and I should be able to log in', async function () {
    // Should be redirected to login page
    const title = await this.page.title();
    assert.strictEqual(title, 'Log In');
});

// Scenario 3: Local Log In and Log Out
Given('I already have an account', async function () {
    // For this dummy test, we assume 'testuser' exists
    await this.page.goto(`${baseUrl}/login`);
});

When('I enter valid Log In credentials', async function () {
    // Uses either 'testuser' or the dynamically generated user from the previous scenario
    await this.page.type('#uname', sharedUsername);
    await this.page.type('#psw', sharedPassword);

    await Promise.all([
        this.page.waitForNavigation(),
        this.page.click('#submit-login')
    ]);
});

Then('I should be signed in to the application', async function () {
    // Should be on the home page
    const title = await this.page.title();
    assert.strictEqual(title, 'Home - Authenticated');

    const authStatus = await this.page.$eval('#auth-status', el => el.textContent);
    assert.strictEqual(authStatus, 'You are now securely logged in.');
});

Then('when I click log out and confirm, I should return to a non-authenticated state', async function () {
    // Click log out
    await Promise.all([
        this.page.waitForNavigation(),
        this.page.click('#logout-link')
    ]);

    // Verify we are on log out confirmation page
    let title = await this.page.title();
    assert.strictEqual(title, 'Log Out');

    // Confirm log out
    await Promise.all([
        this.page.waitForNavigation(),
        this.page.click('#confirm-yes')
    ]);

    // Verify we are back on landing page
    title = await this.page.title();
    assert.strictEqual(title, 'G2GPT - Home');
});
