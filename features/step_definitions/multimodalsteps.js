const { Given, When, Then } = require("@cucumber/cucumber");
const assert = require("assert");

Given("I am on the dashboard page", async function () {
  await this.page.goto("http://localhost:3000/dashboard", {
    waitUntil: "networkidle2"
  });
});

When("I enter a prompt in the chat box", async function () {
  await this.page.waitForSelector("#user-input");
  await this.page.type("#user-input", "Give me 3 creative app ideas");
});

When("I click the send button", async function () {
  await this.page.click("#send-btn");
});

Then("I should see the multi-model response area", async function () {
  await this.page.waitForSelector("#multi-response-area", { timeout: 10000 });

  const displayValue = await this.page.$eval(
    "#multi-response-area",
    (el) => window.getComputedStyle(el).display
  );

  assert.notStrictEqual(displayValue, "none");
});