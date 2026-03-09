const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set a user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    await page.goto('https://www.ebay.com/itm/314159530462', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));

    const html = await page.content();
    fs.writeFileSync('ebay_page_variations.html', html);
    console.log('Saved to ebay_page_variations.html');
    await browser.close();
})();
