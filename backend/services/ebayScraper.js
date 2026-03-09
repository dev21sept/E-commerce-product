const puppeteer = require('puppeteer');

const fetchEbayProduct = async (url) => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });
        const page = await browser.newPage();

        // Emulate a real user to bypass captcha/bot-check pages
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/'
        });
        await page.setViewport({ width: 1920, height: 1080 });

        // Wait for page load
        await page.goto(url, { waitUntil: 'load', timeout: 90000 }).catch(e => console.log('Navigation timeout/error, proceeding anyway'));

        // Extra wait for dynamic content
        await new Promise(resolve => setTimeout(resolve, 8000));

        const productData = await page.evaluate(() => {
            const getText = (selector) => document.querySelector(selector)?.innerText.trim() || '';
            const getAttribute = (selector, attr) => document.querySelector(selector)?.getAttribute(attr) || '';

            // ---- TITLE ----
            const title = getText('.x-item-title__mainTitle') || getText('h1.x-item-title__mainTitle') || getText('.vi-iw .it-ttl') || getText('h1');

            // ---- PRICE (selling price) ----
            const price = getText('.x-price-primary') || getText('#prcIsum') || getText('.x-bin-price__content');

            // ---- CONDITION ----
            const condition = getText('.x-item-condition-text .ux-textual-display') ||
                getText('.x-item-condition-text') ||
                getText('.x-additional-info__textual-display') ||
                getText('#itemCond') ||
                getText('.ux-icon-text__text') || '';

            // ---- RETAIL / ORIGINAL PRICE ----
            let retailPrice = '';
            // Look for "Was:" price or strikethrough price
            const wasPriceEl = document.querySelector('.x-additional-info__textual-display .ux-textual-display--textualDisplay .STRIKETHROUGH') ||
                document.querySelector('.x-price-primary .ux-textual-display--original') ||
                document.querySelector('.x-additional-info .ux-textual-display--original');
            if (wasPriceEl) {
                retailPrice = wasPriceEl.innerText.trim();
            }
            if (!retailPrice) {
                retailPrice = getText('.vi-originalPrice') || '';
            }

            // ---- DISCOUNT ----
            let discountPercentage = '';
            const discountEl = document.querySelector('.x-additional-info__textual-display .ux-textual-display--textualDisplay') ||
                document.querySelector('.x-price-savings');
            if (discountEl) {
                const discountText = discountEl.innerText || '';
                const match = discountText.match(/(\d+)%\s*off/i);
                if (match) {
                    discountPercentage = match[1] + '% off';
                }
            }

            // ---- ITEM SPECIFICS ----
            const item_specifics = {};
            const specItems = document.querySelectorAll('.ux-layout-section-evo__item, .ux-labels-values, .app-item-specifics__item');
            specItems.forEach(item => {
                let label = item.querySelector('.ux-labels-values__labels, .app-item-specifics__name')?.innerText.trim().replace(':', '') || '';
                let value = item.querySelector('.ux-labels-values__values, .app-item-specifics__value')?.innerText.trim() || '';

                if (!label && !value) {
                    label = item.querySelector('.ux-labels-values__labels')?.innerText.trim().replace(':', '') || '';
                    value = item.querySelector('.ux-labels-values__values')?.innerText.trim() || '';
                }

                if (label && value) {
                    item_specifics[label] = value;
                }
            });

            const brand = item_specifics['Brand'] || '';

            // ---- DESCRIPTION (from seller) ----
            let description = document.querySelector('#ds_div')?.innerHTML ||
                document.querySelector('.x-item-description-child')?.innerHTML ||
                document.querySelector('.x-item-description')?.innerHTML || '';

            if (!description || description.trim() === '') {
                const iframe = document.querySelector('#desc_ifr');
                if (iframe) {
                    try {
                        description = iframe.contentDocument?.querySelector('#ds_div')?.innerHTML ||
                            iframe.contentDocument?.body?.innerHTML || '';
                    } catch (e) {
                        console.log('Iframe access error:', e.message);
                    }
                }
            }

            // ---- ABOUT THIS ITEM (sometimes a separate section) ----
            let aboutItem = '';
            const aboutSection = document.querySelector('.x-about-this-item');
            if (aboutSection) {
                aboutItem = aboutSection.innerText.trim();
            }

            // ---- SELLER INFO ----
            let sellerName = '';
            let sellerFeedback = '';

            // Try multiple selectors for seller info
            const sellerInfoEl = document.querySelector('.x-sellercard-atf__info') ||
                document.querySelector('.x-sellercard-atf') ||
                document.querySelector('.si-content');

            if (sellerInfoEl) {
                const nameEl = sellerInfoEl.querySelector('.ux-seller-section__item--seller a') ||
                    sellerInfoEl.querySelector('a[data-testid="ux-seller-section-link"]') ||
                    sellerInfoEl.querySelector('a.ux-action') ||
                    sellerInfoEl.querySelector('a');
                if (nameEl) {
                    sellerName = nameEl.innerText.trim();
                }

                const feedbackEl = sellerInfoEl.querySelector('.ux-seller-section__item--seller') ||
                    sellerInfoEl.querySelector('.ux-textual-display--textualDisplay');
                if (feedbackEl) {
                    sellerFeedback = feedbackEl.innerText.trim();
                }
            }

            // Fallback selectors for seller
            if (!sellerName) {
                sellerName = getText('.x-sellercard-atf__info a') ||
                    getText('[data-testid="str-title"] a') ||
                    getText('.mbg-nw') || '';
            }
            if (!sellerFeedback) {
                const feedbackText = getText('.x-sellercard-atf__info') || getText('.x-sellercard-atf') || '';
                if (feedbackText) sellerFeedback = feedbackText;
            }

            // ---- VARIATIONS (Size, Color, etc.) ----
            const variationsMap = {};

            // 1. Look for select boxes or custom listboxes
            const selectWrappers = document.querySelectorAll('.x-msku__select-box-wrapper, .msku-sel-cont');
            if (selectWrappers.length > 0) {
                selectWrappers.forEach(wrapper => {
                    let name = '';
                    const nameNode = wrapper.querySelector('.x-msku__label-text, label');
                    if (nameNode) {
                        name = nameNode.innerText.trim().replace(':', '').replace('*', '');
                    }

                    if (name && name.toLowerCase() !== 'quantity') {
                        let options = [];

                        // Try native select first
                        const select = wrapper.querySelector('select');
                        if (select) {
                            options = Array.from(select.querySelectorAll('option'))
                                .map(opt => opt.innerText.trim().split('\n')[0].trim())
                                .filter(val => val && val.toLowerCase() !== '- select -' && val.toLowerCase() !== 'select' && !val.includes('Out of stock'));
                        } else {
                            // Try custom listbox
                            const optionNodes = wrapper.querySelectorAll('[role="option"], .listbox__option, .x-msku__listbox-option, .listbox-option, option');
                            if (optionNodes.length > 0) {
                                options = Array.from(optionNodes)
                                    .map(opt => opt.innerText.trim().split('\n')[0].trim()) // Extract just the first line (e.g. "Graphite" from "Graphite\nMost popular")
                                    .filter(val => val && val.toLowerCase() !== '- select -' && val.toLowerCase() !== 'select' && !val.includes('Out of stock'));
                            }
                        }

                        if (options.length > 0) {
                            variationsMap[name] = options;
                        }
                    }
                });
            } else {
                // Fallback basic select matching
                const selectBoxes = document.querySelectorAll('select.x-msku__select-box, select.msku-sel, .x-msku__select-box:not(div)');
                selectBoxes.forEach(select => {
                    let name = '';
                    const nameNode = select.closest('.x-msku__select-box-wrapper')?.querySelector('.x-msku__label-text') ||
                        select.parentElement?.parentElement?.querySelector('label') ||
                        select.closest('.msku-sel-cont')?.querySelector('label');

                    if (nameNode) {
                        name = nameNode.innerText.trim().replace(':', '').replace('*', '');
                    } else {
                        name = select.getAttribute('name') || select.id;
                    }

                    if (name && name.toLowerCase() !== 'quantity') {
                        let options = [];
                        if (select.tagName === 'SELECT') {
                            options = Array.from(select.querySelectorAll('option'))
                                .map(opt => opt.innerText.trim().split('\n')[0].trim())
                                .filter(val => val && val.toLowerCase() !== '- select -' && val.toLowerCase() !== 'select' && !val.includes('Out of stock'));
                        } else {
                            const optionNodes = select.querySelectorAll('[role="option"]');
                            options = Array.from(optionNodes)
                                .map(opt => opt.innerText.trim().split('\n')[0].trim())
                                .filter(val => val && val.toLowerCase() !== '- select -' && val.toLowerCase() !== 'select' && !val.includes('Out of stock'));
                        }

                        if (options.length > 0) {
                            variationsMap[name] = options;
                        }
                    }
                });
            }

            // 2. Look for button-style variations
            if (Object.keys(variationsMap).length === 0) {
                const variationContainers = document.querySelectorAll('.x-msku__box-group, .msku-box-group');
                variationContainers.forEach(container => {
                    const nameNode = container.closest('.x-msku__select-box-wrapper')?.querySelector('.x-msku__label-text') ||
                        container.parentElement?.querySelector('.x-msku__label-text') ||
                        container.parentElement?.querySelector('label');

                    if (nameNode) {
                        const name = nameNode.innerText.trim().replace(':', '').replace('*', '');
                        const options = Array.from(container.querySelectorAll('button, .x-msku__box-text'))
                            .map(btn => btn.innerText.trim())
                            .filter(val => val && !val.includes('Out of stock'));

                        if (name && options.length > 0) {
                            variationsMap[name] = options;
                        }
                    }
                });
            }

            const variations = Object.keys(variationsMap).map(name => ({
                name,
                values: variationsMap[name]
            }));

            // ---- IMAGES ----
            const images = [];
            const imgElements = document.querySelectorAll('.ux-image-carousel-item img, .ux-image-filmstrip-carousel-item img, .ux-image-magnify__image--magnified');
            imgElements.forEach(img => {
                let src = img.getAttribute('src') || img.getAttribute('data-src');
                if (src && !src.includes('s-l64')) {
                    const highRes = src.replace(/s-l\d+/, 's-l1600');
                    if (!images.includes(highRes)) images.push(highRes);
                }
            });

            if (images.length === 0) {
                const mainImg = getAttribute('#mainImgHandoff', 'src') || getAttribute('#icImg', 'src') || getAttribute('.ux-image-carousel-item.active img', 'src');
                if (mainImg) images.push(mainImg.replace(/s-l\d+/, 's-l1600'));
            }

            if (images.length === 0) {
                const fallbackImg = getAttribute('img[src*="i.ebayimg.com/images/g/"]', 'src');
                if (fallbackImg) images.push(fallbackImg.replace(/s-l\d+/, 's-l1600'));
            }

            return {
                title,
                price,
                retailPrice: retailPrice || '',
                condition,
                brand,
                description,
                aboutItem,
                images,
                variations,
                item_specifics,
                category: getText('.seo-breadcrumb-text span') || '',
                sellerName,
                sellerFeedback,
                discountPercentage: discountPercentage
            };
        });

        // If description is empty, try to get it from the iframe using Puppeteer's frame API
        if (!productData.description || productData.description.trim() === '') {
            try {
                const frames = page.frames();
                for (const frame of frames) {
                    const frameUrl = frame.url();
                    if (frameUrl.includes('vi/description') || frameUrl.includes('desc_ifr') || frameUrl.includes('ebay.com/itm/')) {
                        const iframeDescription = await frame.evaluate(() => {
                            return document.querySelector('#ds_div')?.innerHTML ||
                                document.body?.innerHTML || '';
                        }).catch(() => '');
                        if (iframeDescription && iframeDescription.trim()) {
                            productData.description = iframeDescription;
                            break;
                        }
                    }
                }
            } catch (e) {
                console.log('Iframe description extraction error:', e.message);
            }
        }

        return productData;
    } catch (error) {
        console.error('Scraping error:', error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { fetchEbayProduct };

