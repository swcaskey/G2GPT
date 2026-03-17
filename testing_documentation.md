# Acceptance Testing Documentation

This document describes the procedure used to derive acceptance tests from the product Use Cases and User Stories outlined in the Iteration 1 Report, specifically utilizing Cucumber.js and Puppeteer.

## Procedure for Deriving Acceptance Tests

The Requirement Team established the User Stories using the SMART framework (Specific, Measurable, Achievable, Relevant, Timeboxed). To build standard Acceptance Tests, the Testing Team mapped the *measurability* criteria into standard Gherkin behavior-driven syntax (`Given`, `When`, `Then`).

### 1. Identify Valid User Stories
We identified three core User Stories required for Iteration 1:
- Landing Page Access
- Account Registration
- Local Log In and Log Out

### 2. Map Stories to Gherkin Syntax
Each story contains a defined "Measurable" state or "Possible acceptance check". For example, User Story 1 states:
> *Possible acceptance check: Given I am not logged in, When I visit the application home page, Then I should see the landing page with options to create an account or log in.*

We mapped this directly to a Cucumber Feature file (`features/authentication.feature`):
```gherkin
Scenario: Landing Page Access
  Given I am not logged in
  When I visit the application home page
  Then I should see the landing page with options to create an account or log in
```

### 3. Implement Automation with Puppeteer
The English-language Gherkin steps cannot execute themselves; they require automation code. We mapped the step definitions to Puppeteer (`features/step_definitions/steps.js`).

Puppeteer mimics what a real user would do. For instance, to test "When I enter valid account information and submit the form":
```javascript
When('I enter valid account information and submit the form', async function () {
    await this.page.type('#username', 'testuser');
    await this.page.type('#password', 'testpass123');
    
    await Promise.all([
        this.page.waitForNavigation(),
        this.page.click('#submit-signup')
    ]);
});
```
We use `this.page.type` to simulate keyboard input and `this.page.click` to submit the form, explicitly waiting for the subsequent page load navigation to guarantee the UI is ready for the `Then` verification.

### 4. Configure Test Execution
Cucumber is configured to launch a visible Chromium instance via Puppeteer. This meets the requirement of allowing a 1-minute visual recording of the demo (`features/support/env.js`):
```javascript
BeforeAll(async function () {
    browser = await puppeteer.launch({
        headless: false,
        slowMo: 100 // Slow down to easily visualize actions
    });
});
```

The tests can be executed via `npx cucumber-js`, which simulates user flow from start to finish.
