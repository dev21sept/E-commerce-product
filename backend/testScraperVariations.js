const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // We'll use a URL we know has variations
    await page.goto('https://www.ebay.com/itm/334246875704', { waitUntil: 'networkidle2' });

    // Explicitly wait for the variations container if it exists
    try {
        await page.waitForSelector('.x-msku', { timeout: 3000 });
    } catch (e) {
        console.log('No .x-msku found within 3s');
    }

    const variations = await page.evaluate(() => {
        const variationsMap = {};

        // 1. Check standard select boxes
        const selectBoxes = document.querySelectorAll('select.x-msku__select-box, select.msku-sel, .x-msku__select-box, .x-msku__select');
        selectBoxes.forEach(select => {
            let name = '';
            const nameNode = select.closest('.x-msku__select-box-wrapper')?.querySelector('.x-msku__label-text') ||
                select.closest('.msku-sel-cont')?.querySelector('label') ||
                select.parentElement?.parentElement?.querySelector('label');

            if (nameNode) {
                name = nameNode.innerText.trim().replace(':', '').replace('*', '');
            } else {
                name = select.getAttribute('name') || select.id || 'Variation';
            }

            if (name.toLowerCase() !== 'quantity') {
                const options = Array.from(select.querySelectorAll('option'))
                    .map(opt => opt.innerText.trim())
                    .filter(val => val && val.toLowerCase() !== '- select -' && !val.includes('Out of stock'));

                if (options.length > 0) {
                    variationsMap[name] = options;
                }
            }
        });

        // 2. Fallback: check window object for eBay's internal item model
        if (Object.keys(variationsMap).length === 0) {
            try {
                // Sometimes eBay stores it in window.$rmd or similar, but we can't easily access that from page.evaluate without risking isolation issues.
                // We'll search the DOM scripts for "menuItemModels" or "variation"
                const scripts = Array.from(document.querySelectorAll('script'));
                for (let script of scripts) {
                    const html = script.innerHTML;
                    if (html.includes('"menuItemModels"')) {
                        const match = html.match(/"menuItemModels":(\[.*?\])/);
                        if (match) {
                            const models = JSON.parse(match[1]);
                            models.forEach(m => {
                                const name = m.name;
                                const opts = m.values ? m.values.map(v => v.name) : [];
                                if (name && opts.length > 0) variationsMap[name] = opts;
                            });
                        }
                    }
                }
            } catch (e) { }
        }

        return Object.keys(variationsMap).map(name => ({
            name,
            values: variationsMap[name]
        }));
    });

    console.log('Extracted Variations:', JSON.stringify(variations, null, 2));
    await browser.close();
})();
