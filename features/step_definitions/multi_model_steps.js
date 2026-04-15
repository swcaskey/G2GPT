const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const db = require('../../database');

const baseUrl = 'http://localhost:3000';
const seededEmail = 'acceptance.user@example.com';
const seededPassword = 'password123';

function seedUserAndClearConversations() {
  db.prepare('INSERT OR IGNORE INTO users (email, password) VALUES (?, ?)').run(seededEmail, seededPassword);
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(seededEmail);
  db.prepare('DELETE FROM conversations WHERE user_id = ?').run(user.id);
}

async function openModelSelector(page) {
  await page.waitForSelector('#model-dropdown-btn', { timeout: 10000 });
  await page.click('#model-dropdown-btn');
  await page.waitForSelector('#model-list .model-item input[type="checkbox"]', { timeout: 10000 });
}

async function closeModelSelector(page) {
  await page.click('#model-dropdown-btn');
}

async function getSelectedModelNames(page) {
  return page.evaluate(() => {
    const selected = [];
    document.querySelectorAll('#model-list .model-item input[type="checkbox"]').forEach((checkbox) => {
      if (checkbox.checked) selected.push(checkbox.value);
    });
    return selected;
  });
}

Given('I am logged in as a seeded acceptance user', async function () {
  seedUserAndClearConversations();

  await this.page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
  await this.page.waitForSelector('#loginEmail', { timeout: 10000 });

  await this.page.$eval('#loginEmail', (el, value) => { el.value = value; }, seededEmail);
  await this.page.$eval('#loginPassword', (el, value) => { el.value = value; }, seededPassword);

  await Promise.all([
    this.page.waitForNavigation({ timeout: 10000 }),
    this.page.click('#login-btn')
  ]);

  const title = await this.page.title();
  assert.strictEqual(title, 'G2GPT - Dashboard');
});

When('I open the model selector and choose one model', async function () {
  await openModelSelector(this.page);

  const selectedCount = await this.page.evaluate(
    () => document.querySelectorAll('#model-list .model-item input[type="checkbox"]:checked').length
  );

  if (selectedCount === 0) {
    await this.page.click('#model-list .model-item input[type="checkbox"]');
  }

  this.selectedModels = await getSelectedModelNames(this.page);
  await closeModelSelector(this.page);
});

Then('exactly one model should be selected', async function () {
  assert.strictEqual(this.selectedModels.length, 1);
});

When('I open the model selector and choose a second model', async function () {
  await openModelSelector(this.page);

  const secondCheckboxHandle = await this.page.evaluateHandle(() => {
    const checkboxes = Array.from(document.querySelectorAll('#model-list .model-item input[type="checkbox"]'));
    return checkboxes.find((checkbox) => !checkbox.checked) || null;
  });

  const secondCheckbox = secondCheckboxHandle.asElement();
  assert.ok(secondCheckbox, 'Expected at least two available models.');
  await secondCheckbox.click();
  await secondCheckboxHandle.dispose();

  this.selectedModels = await getSelectedModelNames(this.page);
  await closeModelSelector(this.page);
});

Then('exactly two models should be selected', async function () {
  assert.strictEqual(this.selectedModels.length, 2);
});

Given('I have selected two models', async function () {
  await openModelSelector(this.page);

  await this.page.evaluate(() => {
    const checkboxes = Array.from(document.querySelectorAll('#model-list .model-item input[type="checkbox"]'));
    checkboxes.forEach((checkbox, idx) => {
      checkbox.checked = idx < 2;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  this.selectedModels = await getSelectedModelNames(this.page);
  assert.strictEqual(this.selectedModels.length, 2);
  await closeModelSelector(this.page);
});

When('I send a multi-model prompt', async function () {
  const prompt = `Compare answers ${Date.now()}`;
  this.promptText = prompt;

  await this.page.waitForSelector('#user-input', { timeout: 10000 });
  await this.page.type('#user-input', prompt);
  await this.page.click('#send-btn');

  await this.page.waitForFunction(
    () => document.querySelectorAll('#messages .msg-row.assistant.multi-model').length >= 2,
    { timeout: 15000 }
  );
});

Then('I should see labeled responses for both selected models', async function () {
  const labels = await this.page.evaluate(() =>
    Array.from(document.querySelectorAll('#messages .model-label')).map((el) => el.textContent.trim().toLowerCase())
  );

  assert.ok(labels.length >= 2, 'Expected at least two model labels in responses.');
  this.selectedModels.forEach((modelName) => {
    assert.ok(labels.includes(modelName.toLowerCase()), `Missing response label for model ${modelName}`);
  });
});

When('I reload and reopen the latest conversation', async function () {
  await this.page.reload({ waitUntil: 'networkidle0' });
  await this.page.waitForSelector('#history-list .history-item', { timeout: 10000 });
  await this.page.click('#history-list .history-item');

  await this.page.waitForFunction(
    () => document.querySelectorAll('#messages .model-label').length >= 2,
    { timeout: 15000 }
  );
});

Then('the reopened conversation should show model labels', async function () {
  const labels = await this.page.evaluate(() =>
    Array.from(document.querySelectorAll('#messages .model-label')).map((el) => el.textContent.trim().toLowerCase())
  );

  assert.ok(labels.length >= 2, 'Expected model labels after reopening conversation.');
  this.selectedModels.forEach((modelName) => {
    assert.ok(labels.includes(modelName.toLowerCase()), `Expected persisted label for model ${modelName}`);
  });
});
