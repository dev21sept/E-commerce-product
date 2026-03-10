const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new"
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto("https://www.ebay.com/sch/i.html?_nkw=t+shirt+cotton+men", { waitUntil: 'load', timeout: 60000 });

        // Find links
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.s-item__link')).map(a => a.href).filter(href => href.includes('/itm/'));
        });

        console.log("Found links:", links.length);

        // Visit first 3 to find variations
        for (const url of links.slice(0, 5)) {
            console.log('Trying:', url);
            await page.goto(url, { waitUntil: 'load', timeout: 60000 });
            await new Promise(r => setTimeout(r, 3000));

            const hasSelect = await page.evaluate(() => {
                return document.querySelectorAll('select, [role="listbox"], .x-msku').length;
            });

            if (hasSelect > 0) {
                console.log("Variations FOUND at:", url);
                const html = await page.content();
                fs.writeFileSync('dev_msku_test.html', html);
                return;
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (browser) await browser.close();
    }
})();
