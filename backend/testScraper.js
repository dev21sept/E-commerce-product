const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set a user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto('https://www.ebay.com/itm/235332883011', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 4000));

    await page.screenshot({ path: 'screenshot.png', fullPage: true });

    // Try to find raw JSON variables
    const itmObj = await page.evaluate(() => {
        return {
            title: document.title,
            hasSelects: document.querySelectorAll('select').length,
            hasLabels: document.querySelectorAll('.ux-labels-values').length,
            hasAppItemObj: document.querySelectorAll('.app-item-specifics').length
        }
    });

    console.log(JSON.stringify(itmObj, null, 2));

    await browser.close();
})();
