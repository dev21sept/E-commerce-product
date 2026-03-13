const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto('https://www.ebay.com/itm/134988755620', {waitUntil: 'domcontentloaded'});
    
    const catData = await page.evaluate(() => {
        let categoryId = '';
        
        // Strategy 1: Look at breadcrumb links (b/bn_... or category/...)
        const breadcrumbs = document.querySelectorAll('.seo-breadcrumb-text a, .breadcrumbs a');
        for (let i = breadcrumbs.length - 1; i >= 0; i--) {
            const href = breadcrumbs[i].href;
            const match = href.match(/bn_(\d+)/) || href.match(/\/(?:category|sch|b)\/[^\/]+\/(\d+)\//);
            if (match) {
                categoryId = match[1];
                break; // Get the deepest category ID
            }
        }
        
        // Strategy 2: Look in JS variables or meta tags
        if (!categoryId) {
            const html = document.documentElement.innerHTML;
            const match = html.match(/"categoryId":"(\d+)"/) || html.match(/"catId":"(\d+)"/);
            if (match) {
                categoryId = match[1];
            }
        }
        
        return {
            categoryName: document.querySelector('.seo-breadcrumb-text')?.innerText || '',
            categoryId
        };
    });
    console.log("CATEGORY RESULT: ", catData);
    await browser.close();
})();
