const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto('https://www.ebay.com/itm/334246875704', { waitUntil: 'networkidle2' });

    // Evaluate page to find anything that looks like a dropdown or listbox
    const info = await page.evaluate(() => {
        const results = [];

        // 1. Find elements containing 'Select' text
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            if (node.nodeValue.includes(': Select') || node.nodeValue.includes('Select ')) {
                const el = node.parentElement;
                if (el && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
                    // Go up a few parents to see the structure
                    const container = el.closest('div, ul, li') || el.parentElement;
                    const htmlSnippet = container.innerHTML.substring(0, 200).replace(/\n/g, '');
                    results.push({ text: node.nodeValue.trim(), containerTag: container.tagName, snippet: htmlSnippet });
                }
            }
        }

        // 2. Find all select elements just to be absolutely sure
        const selects = document.querySelectorAll('select');
        selects.forEach(s => {
            const options = Array.from(s.options).map(o => o.text);
            results.push({ isSelect: true, id: s.id, name: s.name, options });
        });

        return results;
    });

    console.log(JSON.stringify(info, null, 2));
    await browser.close();
})();
