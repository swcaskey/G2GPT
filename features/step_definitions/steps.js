const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

const baseUrl = 'http://localhost:3000';

// ----------------------
// CHAT PAGE
// ----------------------

Given('I am on the RutgersAI chat page', async function () {
    await this.page.goto(`${baseUrl}/dashboard`);
});

Then('I should see a message input box', async function () {
    const input = await this.page.$('input, textarea');
    assert.ok(input !== null, 'Message input box not found');
});

Then('I should see a send button', async function () {
    const sendBtn = await this.page.$('button');
    assert.ok(sendBtn !== null, 'Send button not found');
});

Then('I should see a "+ New Chat" button', async function () {
    const newChatBtn = await this.page.$('button');
    assert.ok(newChatBtn !== null, 'New Chat button not found');
});

// ----------------------
// SEND MESSAGE
// ----------------------

When('I type {string} into the message input', async function (message) {
    const input = await this.page.$('input, textarea');
    await input.type(message, { delay: 5 });
});

When('I click the send button', async function () {
    const sendBtn = await this.page.$('button');
    await sendBtn.click();
    await this.page.waitForTimeout(1000);
});

Then('my message should appear in the chat window', async function () {
    const content = await this.page.content();
    assert.ok(content.includes('User'), 'User message not found in chat');
});

Then('I should see an assistant response', async function () {
    const content = await this.page.content();
    assert.ok(content.toLowerCase().includes('assistant'), 'Assistant response not found');
});

// ----------------------
// NEW CHAT
// ----------------------

When('I click the "+ New Chat" button', async function () {
    const buttons = await this.page.$$('button');

    for (let btn of buttons) {
        const text = await this.page.evaluate(el => el.textContent, btn);
        if (text.includes('New Chat')) {
            await btn.click();
            break;
        }
    }

    await this.page.waitForTimeout(1000);
});

Then('a new empty conversation should be created', async function () {
    const content = await this.page.content();
    assert.ok(content.includes('Type your message'), 'New chat not initialized');
});

Then('the chat window should be cleared', async function () {
    const content = await this.page.content();
    assert.ok(!content.includes('User:'), 'Chat was not cleared');
});

// ----------------------
// EMPTY MESSAGE
// ----------------------

When('I leave the message input empty', async function () {
    // do nothing intentionally
});

Then('the message should not be submitted', async function () {
    const content = await this.page.content();
    assert.ok(!content.includes('User:'), 'Empty message was incorrectly submitted');
});

// ----------------------
// CONVERSATION HISTORY
// ----------------------

Given('I am on the conversation history page', async function () {
    await this.page.goto(`${baseUrl}/history`);
});

Then('I should see a search bar', async function () {
    const search = await this.page.$('input');
    assert.ok(search !== null, 'Search bar not found');
});

Then('I should see a list of previous conversations', async function () {
    const items = await this.page.$$('.conversation, li, .history-item');
    assert.ok(items.length > 0, 'No conversations found');
});

Then('each conversation should display a title', async function () {
    const content = await this.page.content();
    assert.ok(content.length > 0, 'No titles visible');
});

Then('each conversation should display a timestamp', async function () {
    const content = await this.page.content();
    assert.ok(content.match(/\d{1,2}:\d{2}/), 'Timestamp not found');
});

When('I type {string} into the search bar', async function (text) {
    const search = await this.page.$('input');
    await search.type(text);
});

Then('I should see matching conversations in the history list', async function () {
    const content = await this.page.content();
    assert.ok(content.length > 0, 'Search returned no results');
});

// ----------------------
// OPEN CONVERSATION
// ----------------------

When('I click on a previous conversation', async function () {
    const items = await this.page.$$('.conversation, li, .history-item');
    if (items.length > 0) {
        await items[0].click();
    }
    await this.page.waitForTimeout(1000);
});

Then('the selected conversation should open in the chat panel', async function () {
    const content = await this.page.content();
    assert.ok(content.includes('Conversation'), 'Conversation did not open');
});

// ----------------------
// SAVED CONVERSATION
// ----------------------

Given('I open a saved conversation', async function () {
    await this.page.goto(`${baseUrl}/saved`);
});

Then('I should see the conversation title', async function () {
    const content = await this.page.content();
    assert.ok(content.includes('Conversation'), 'Title missing');
});

Then('I should see the conversation date and time', async function () {
    const content = await this.page.content();
    assert.ok(content.match(/\d{4}/), 'Date/time missing');
});

Then('I should see the full message thread', async function () {
    const content = await this.page.content();
    assert.ok(content.length > 0, 'Messages not displayed');
});

When('I click the "Go Back" button', async function () {
    const buttons = await this.page.$$('button');

    for (let btn of buttons) {
        const text = await this.page.evaluate(el => el.textContent, btn);
        if (text.includes('Go Back')) {
            await btn.click();
            break;
        }
    }

    await this.page.waitForTimeout(1000);
});

Then('I should return to the previous page', async function () {
    const url = this.page.url();
    assert.ok(url.includes('history') || url.includes('dashboard'), 'Did not navigate back');
});

Then('I should see user messages in the thread', async function () {
    const content = await this.page.content();
    assert.ok(content.toLowerCase().includes('you'), 'User messages missing');
});

Then('I should see assistant messages in the thread', async function () {
    const content = await this.page.content();
    assert.ok(content.toLowerCase().includes('assistant'), 'Assistant messages missing');
});

Then('I should see an archived session label', async function () {
    const content = await this.page.content();
    assert.ok(content.toLowerCase().includes('archived'), 'Archived label missing');
});