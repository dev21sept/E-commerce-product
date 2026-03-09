const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto('https://www.ebay.com/itm/314159530462', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));

    const variations = await page.evaluate(() => {
        // Let's actually look for multi-variation dropdowns differently
        const found = [];

        // Sometimes variations are in list items acting as buttons (a, button) inside a container
        // .x-msku contains variations
        const mskuOptions = document.querySelectorAll('.x-msku');

        // Look for any label that contains "Size", "Color" etc
        const labels = document.querySelectorAll('label, .x-msku__label');

        const variationsMap = {};
        labels.forEach(l => {
            const text = l.innerText.trim();
            if (text.endsWith(':') || text.includes('Size') || text.includes('Color')) {
                // If it's a label for a select
                const parent = l.closest('.x-msku__select-box-wrapper') || l.parentElement;
                if (!parent) return;

                const select = parent.querySelector('select');
                if (select) {
                    const name = text.replace(':', '').replace('*', '');
                    const options = Array.from(select.querySelectorAll('option'))
                        .map(opt => opt.innerText.trim())
                        .filter(val => val && val.toLowerCase() !== '- select -' && !val.includes('Out of stock'));
                    if (options.length > 0) variationsMap[name] = options;
                } else {
                    // It might be a list of buttons
                    const listbox = parent.parentElement?.querySelector('[role="listbox"]') || parent.nextElementSibling;
                    if (listbox) {
                        const buttons = Array.from(listbox.querySelectorAll('[role="option"], button, .x-msku__opt'));
                        const options = buttons.map(b => b.innerText.trim()).filter(Boolean);
                        const name = text.replace(':', '').replace('*', '').replace('Select', '').trim();
                        if (name && options.length > 0) variationsMap[name] = options;
                    }
                }
            }
        });

        // Also check if eBay embedded it in the global object
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const script of scripts) {
            const text = script.innerText;
            if (text.includes('"menuItemMap"')) {
                // Try to extract it
                const match = text.match(/"menuItemMap":(\[.*?\]),"menuItemModels"/);
                if (match) {
                    try {
                        const menuItemMap = JSON.parse(match[1]);
                        menuItemMap.forEach(menu => {
                            const name = menu.label || menu.name;
                            const options = menu.values ? menu.values.map(v => v.name || v.label || v) : [];
                            if (name && options.length > 0) variationsMap[name] = options;
                        });
                    } catch (e) { }
                }
            }
        }

        return Object.keys(variationsMap).map(name => ({
            name,
            values: variationsMap[name]
        }));
    });

    console.log(JSON.stringify(variations, null, 2));
    await browser.close();
})();
