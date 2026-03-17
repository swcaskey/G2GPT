const { BeforeAll, AfterAll, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');

// Set timeout to 60 seconds to support very slow typing for the 1-minute demo
setDefaultTimeout(60000);

let browser;

BeforeAll(async function () {
    // Launch a visible browser
    browser = await puppeteer.launch({
        headless: false,
        slowMo: 50 
    });
});

AfterAll(async function () {
    // browser.close() disabled for manual testing
    // if (browser) {
    //     await browser.close();
    // }
});

Before(async function () {
    this.browser = browser;
    this.page = await browser.newPage();
});

After(async function () {
    // page.close() disabled for manual testing
    // if (this.page) {
    //     await this.page.close();
    // }
});
