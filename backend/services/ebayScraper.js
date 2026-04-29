let puppeteer;
if (process.env.NODE_ENV === 'production') {
    puppeteer = require('puppeteer-core');
} else {
    puppeteer = require('puppeteer');
}
const chromium = process.env.NODE_ENV === 'production' ? require('@sparticuz/chromium') : null;

const axios = require('axios');
const cheerio = require('cheerio');

const fetchEbayProduct = async (url) => {
    console.log(`[SCRAPER] Scraping URL: ${url}`);
    
    // 🚀 STEP 1: LIGHT SCRAPE (AXIOS + CHEERIO) - Extremely Fast, No Timeout
    try {
        console.log(`[SCRAPER] Trying Light Scrape (Axios)...`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 10000 
        });

        const $ = cheerio.load(response.data);
        
        // Extract Title
        const title = $('.x-item-title__mainTitle').text().trim() || $('h1').first().text().trim();
        
        if (title) {
            console.log(`✅ [SCRAPER] Light Scrape Successful! Title: ${title.substring(0, 30)}...`);
            
            // Extract Price
            const price = $('.x-price-primary').text().trim() || $('#prcIsum').text().trim() || $('.x-bin-price__content').text().trim();
            
            // Extract Images
            const images = [];
            const html = response.data;
            const imgMatches = html.match(/https:\/\/i\.ebayimg\.com\/images\/g\/[^\/]+\/s-l\d+\.(?:jpg|png|webp)/g) || [];
            imgMatches.forEach(img => {
                const highRes = img.replace(/s-l\d+/, 's-l1600');
                if (!images.includes(highRes)) images.push(highRes);
            });

            // Extract Condition
            const condition = $('.x-item-condition-text .ux-textual-display').text().trim() || $('.x-item-condition-text').text().trim();

            // Extract Category
            let categoryId = '';
            const catMatch = html.match(/"leafCategoryId":\s*(\d+)/) || html.match(/"categoryId":"(\d+)"/);
            if (catMatch) categoryId = catMatch[1];

            const breadcrumbs = $('.seo-breadcrumb-text span, .breadcrumbs li span').map((i, el) => $(el).text().trim()).get();
            const category = breadcrumbs.filter(t => t && t !== '>').join(' > ');

            // Extract Item Specifics
            const item_specifics = {};
            $('.ux-layout-section-evo__item, .ux-labels-values').each((i, el) => {
                const label = $(el).find('.ux-labels-values__labels').text().trim().replace(':', '');
                const value = $(el).find('.ux-labels-values__values').text().trim();
                if (label && value) item_specifics[label] = value;
            });

            // Description extraction
            const iframeSrcMatch = html.match(/id="desc_ifr"[^>]*src="([^"]+)"/);
            const iframeSrc = iframeSrcMatch ? iframeSrcMatch[1] : null;

            const productData = {
                title,
                price,
                condition,
                images: images.slice(0, 12),
                item_specifics,
                categoryId,
                category,
                brand: item_specifics['Brand'] || 'Unbranded'
            };

            if (iframeSrc) {
                try {
                    const { fetchDescriptionOnly } = require('./descriptionService');
                    productData.description = await fetchDescriptionOnly(url, iframeSrc);
                } catch (e) {
                    console.log('Description fetch failed, skipping.');
                }
            }

            return productData;
        }
    } catch (lightErr) {
        console.log(`⚠️ [SCRAPER] Light Scrape Failed: ${lightErr.message}. Falling back to Puppeteer...`);
    }

    // 🐢 STEP 2: FULL SCRAPE (PUPPETEER) - Fallback
    let browser;
    try {
        let launchOptions = {
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        };

        if (process.env.NODE_ENV === 'production') {
            launchOptions = {
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
                ignoreHTTPSErrors: true,
            };
        }

        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const productData = await page.evaluate(() => {
            const getText = (selector) => document.querySelector(selector)?.innerText.trim() || '';
            const getAttribute = (selector, attr) => document.querySelector(selector)?.getAttribute(attr) || '';
            
            const title = getText('.x-item-title__mainTitle') || getText('h1');
            const price = getText('.x-price-primary') || getText('#prcIsum');
            const condition = getText('.x-item-condition-text .ux-textual-display') || getText('.x-item-condition-text');
            
            const images = [];
            document.querySelectorAll('.ux-image-carousel-item img, .ux-image-filmstrip-carousel-item img').forEach(img => {
                let src = img.getAttribute('src') || img.getAttribute('data-src');
                if (src) images.push(src.replace(/s-l\d+/, 's-l1600'));
            });

            const item_specifics = {};
            document.querySelectorAll('.ux-layout-section-evo__item, .ux-labels-values').forEach(item => {
                let label = item.querySelector('.ux-labels-values__labels')?.innerText.trim().replace(':', '') || '';
                let value = item.querySelector('.ux-labels-values__values')?.innerText.trim() || '';
                if (label && value) item_specifics[label] = value;
            });

            return {
                title,
                price,
                condition,
                images: images.slice(0, 12),
                item_specifics,
                brand: item_specifics['Brand'] || 'Unbranded'
            };
        });

        // For Puppeteer, we also try to get category info from scripts
        const html = await page.content();
        const catMatch = html.match(/"leafCategoryId":\s*(\d+)/) || html.match(/"categoryId":"(\d+)"/);
        if (catMatch) productData.categoryId = catMatch[1];

        return productData;
    } catch (error) {
        console.error('Final Scraper Error:', error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { fetchEbayProduct };
