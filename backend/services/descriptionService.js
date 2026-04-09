const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const sanitizeHtml = require('sanitize-html');

/**
 * DIRECT-NAV EBAY DESCRIPTION SCRAPER
 * Extracts iframe src and navigates directly to it for 100% reliability.
 */
const fetchDescriptionOnly = async (url, providedIframeSrc = null) => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        let iframeSrc = providedIframeSrc;

        if (!iframeSrc) {
            console.log(`[DescriptionService] Step 1: Loading main page to find iframe src (Fallback)...`);
            // Use networkidle2 instead of domcontentloaded for fallback
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Wait specifically for the iframe selector
            await page.waitForSelector("#desc_ifr", { timeout: 15000 }).catch(() => null);

            // 1. Get the iframe source from the main page
            iframeSrc = await page.evaluate(() => {
                const ifr = document.getElementById('desc_ifr') || document.querySelector('iframe[src*="ebaydesc.com"]');
                return ifr ? ifr.src : null;
            });
        } else {

            console.log(`[DescriptionService] Using provided iframe src. Skipping main page load.`);
        }

        if (!iframeSrc) {
            console.log("[DescriptionService] No description iframe found.");
            return "";
        }


        console.log(`[DescriptionService] Step 2: Navigating directly to iframe src: ${iframeSrc.substring(0, 50)}...`);

        // 2. Navigate the browser directly to the description URL
        // This avoids all frame-switching and cross-origin headaches
        await page.goto(iframeSrc, { waitUntil: 'domcontentloaded', timeout: 40000 });

        // 3. Wait for the actual seller div
        await page.waitForSelector("body", { timeout: 10000 });

        // 4. Extract content with safer logging
        const debugInfo = await page.evaluate(() => {
            const bodyText = document.body ? document.body.innerText.substring(0, 200) : "";
            const foundIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
            return { bodyPreview: bodyText, ids: foundIds };
        }).catch(() => ({ bodyPreview: "Failed to get preview", ids: [] }));

        console.log(`[DescriptionService] Debug - Body Preview: ${debugInfo.bodyPreview}`);

        const rawHtml = await page.evaluate(() => {
            try {
                // 1. Check for standard container
                const dsDiv = document.getElementById('ds_div') || document.getElementById('desc_div');
                if (dsDiv && dsDiv.innerHTML) {
                    const html = dsDiv.innerHTML.trim();
                    if (html.length > 5) return html;
                }

                // 2. Check for leakage on body
                const bodyText = document.body ? document.body.innerText : "";
                if (bodyText.includes("Skip to main content")) {
                    return "LEAKAGE_DETECTED";
                }

                // 3. Last resort - whole body
                return document.body ? document.body.innerHTML : "";
            } catch (err) {
                return "";
            }
        });

        if (!rawHtml || rawHtml === "LEAKAGE_DETECTED") {
            console.log("[DescriptionService] No valid description html found.");
            return "";
        }

        // Final length check outside evaluate
        if (typeof rawHtml === 'string' && rawHtml.trim().length < 5) {
            return "";
        }

        // 5. Final safety check (Anti-Leak)
        const lower = rawHtml.toLowerCase();
        if (lower.includes("skip to main content")) {
            return "";
        }

        // 6. ---- ULTRA-AGGRESSIVE TEMPLATE CLEANER ----
        const $ = cheerio.load(rawHtml);

        // A. Remove by Tag and Common Template Classes
        $('nav, header, footer, script, style, aside, .gh-top, #gh-top, .store-header, .menu, #menu, .navigation, .sidebar, .footer-links').remove();

        // B. Keyword-based Element Removal (Removes whole blocks containing menu words)
        const menuKeywords = [
            'home', 'about us', 'feedback', 'view all listings', 'store pages',
            'contact us', 'newsletter', 'shipping', 'payment', 'terms of sale',
            'perfume for her', 'perfume for him', 'testers for her', 'testers for him',
            'unisex', 'kids', 'gift sets', 'brand outlet', 'men\'s', 'women\'s'
        ];

        $('div, ul, li, section, table').each((i, el) => {
            const $el = $(el);
            const text = $el.text().toLowerCase().trim();

            // If the element's text IS exactly one of these, or starts with a menu pattern
            const isMenu = menuKeywords.some(key => {
                // Exact match or if the text is basically just a few menu words
                return text === key || (text.includes(key) && text.length < key.length + 10);
            });

            // Special check for long menu strings (like the one the user reported)
            const hasManyMenuGems = menuKeywords.filter(key => text.includes(key)).length >= 3;

            if (isMenu || hasManyMenuGems) {
                // Only remove if it's not the ONLY content (safety check)
                if (text.length < 500) {
                    $el.remove();
                }
            }
        });

        // C. Clean "Logo" or "Header" images
        $('img').each((i, el) => {
            const alt = $(el).attr('alt')?.toLowerCase() || "";
            const src = $(el).attr('src')?.toLowerCase() || "";
            if (alt.includes('logo') || alt.includes('banner') || src.includes('logo') || src.includes('header')) {
                $(el).remove();
            }
        });

        const cleanedHtml = $('body').html() || rawHtml;


        // 7. SANITIZE (Only basic tags)
        const result = sanitizeHtml(cleanedHtml, {
            allowedTags: [
                "p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "div", "span",
                "table", "tbody", "tr", "td", "img", "h1", "h2", "h3"
            ],
            allowedAttributes: {
                "img": ["src", "alt", "width", "height"],
                "div": ["style", "class"],
                "span": ["style", "class"],
                "p": ["style", "class"]
            }
        }).trim();

        return wrapInTemplate(result);


    } catch (e) {
        console.error("[DescriptionService] CRITICAL ERROR:", e.message);
        return "";
    } finally {
        if (browser) await browser.close();
    }
};

/**
 * Wraps content in a professional eBay template
 */
const wrapInTemplate = (content, title = 'Product Details') => {
    if (!content) return "";
    
    // Check if already templated
    if (content.includes('ebay-template-container')) return content;

    return `
<div id="ds_div" class="ebay-template-container" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 900px; margin: 20px auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; color: #1f2937; line-height: 1.6; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <div style="margin-bottom: 25px; border-bottom: 2px solid #4f46e5; padding-bottom: 15px;">
        <h2 style="margin: 0; color: #4f46e5; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">${title}</h2>
    </div>
    <div class="description-content" style="font-size: 16px;">
        ${content}
    </div>
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 13px; color: #6b7280; font-style: italic; display: flex; align-items: center; gap: 10px;">
        <div style="width: 8px; h-8px; background-color: #4f46e5; border-radius: 50%;"></div>
        <span>Thank you for shopping with us! Fast shipping & professional handling guaranteed.</span>
    </div>
</div>`.trim();
};

module.exports = { fetchDescriptionOnly, wrapInTemplate };
