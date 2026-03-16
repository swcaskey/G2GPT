const { BeforeAll, AfterAll, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');

// Set timeout to 10 seconds for browser operations
setDefaultTimeout(10000);

let browser;

BeforeAll(async function () {
    // Launch a visible browser so the demo can be recorded
    browser = await puppeteer.launch({
        headless: false,
        slowMo: 100 // Slow down actions by 100ms so they are easier to see on video
    });
});

AfterAll(async function () {
    if (browser) {
        await browser.close();
    }
});

Before(async function () {
    this.browser = browser;
    this.page = await browser.newPage();
});

After(async function () {
    if (this.page) {
        await this.page.close();
    }
});
