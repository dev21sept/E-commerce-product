console.log("[eBay AutoLister] Content script active!");

// --- STORAGE-BASED STATE (PERSISTS REFRESHES) ---
function getPageState(key) { return sessionStorage.getItem('ebay_lister_' + key); }
function setPageState(key, val) { sessionStorage.setItem('ebay_lister_' + key, val); }

// --- FEATURE 0: ENSURE PROPER FORMAT ---
async function ensureBuyItNowFormat() {
    console.log("[eBay AutoLister] Verifying Format...");
    
    // 0. QUICK EXIT: If already set, don't do anything!
    const allTriggers = Array.from(document.querySelectorAll('button, [role="combobox"], .listbox__control, .ux-action-button'));
    const currentMode = allTriggers.find(b => 
        (b.innerText?.toLowerCase().includes("buy it now") || b.innerText?.toLowerCase().includes("fixed price")) && 
        b.offsetParent !== null && 
        !b.innerText.toLowerCase().includes("auction")
    );

    if (currentMode) {
        console.log("[eBay AutoLister] ✅ Buy It Now already active. No action needed.");
        setPageState('format_fixed', 'true');
        return true;
    }

    // 1. Direct check for the "Auction" trigger (to switch it)
    const auctionTrigger = allTriggers.find(b => b.innerText?.toLowerCase().trim() === "auction" && b.offsetParent !== null);
    
    if (auctionTrigger) {
        console.log("[eBay AutoLister] ⚡ Auction detected. Switching...");
        auctionTrigger.scrollIntoView({ behavior: 'smooth', block: 'center' });
        auctionTrigger.click();
        await new Promise(r => setTimeout(r, 1200));
        
        const options = Array.from(document.querySelectorAll('.listbox__option, [role="option"], .menu__item, .listbox__control'));
        const binOption = options.find(o => 
            (o.innerText.toLowerCase().includes("buy it now") || o.innerText.toLowerCase().includes("fixed price")) && 
            o.innerText.toLowerCase() !== "auction"
        );
        
        if (binOption) {
            binOption.click();
            await new Promise(r => setTimeout(r, 3000)); 
            setPageState('format_fixed', 'true');
            return true;
        }
    }

    // 2. Fallback: Warning link
    const warningLink = Array.from(document.querySelectorAll('a, button')).find(el => el.innerText.toLowerCase().includes("go to pricing format"));
    if (warningLink) {
        warningLink.click();
        await new Promise(r => setTimeout(r, 1500));
        return await ensureBuyItNowFormat(); 
    }

    return false;
}

// --- UTILITY: Simulation (Human-like Typing & Selecting) ---
async function setInputValue(selectorOrEl, value) {
    const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!el || el.disabled) return false;

    try {
        console.log(`[eBay AutoLister] Attempting to set "${value}" for:`, el);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 1. Try "Frequently selected" or visible options first (Best for eBay)
        const container = el.closest('.summary__attributes--field, [data-testid="attribute"], .ux-labels-values, .form-field, .aspect-name') || el.parentElement;
        const findOption = (root) => Array.from(root.querySelectorAll('button, span, a, [role="option"]'))
                .find(s => s.innerText?.toLowerCase().trim() === String(value).toLowerCase().trim() && s !== el && s.offsetParent !== null);

        let suggestion = findOption(container);
        if (suggestion) {
            console.log("[eBay AutoLister] Clicking Suggestion Choice:", suggestion.innerText);
            suggestion.click();
            await new Promise(r => setTimeout(r, 1000));
            return true;
        }

        // 2. Click the element if it's a button/combobox to activate the input or show menu
        if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'combobox') {
            console.log("[eBay AutoLister] Clicking element to open menu/input...");
            el.click();
            await new Promise(r => setTimeout(r, 1000));
            // Re-check for options after clicking
            suggestion = findOption(document);
            if (suggestion) {
                console.log("[eBay AutoLister] Clicking Choice after activation:", suggestion.innerText);
                suggestion.click();
                await new Promise(r => setTimeout(r, 1000));
                return true;
            }
        }

        // 3. Look for an input to type into
        let input = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? el : null;
        if (!input) {
            // Look for a search box or input triggered by the click
            input = container.querySelector('input:not([type="hidden"])') || 
                    document.activeElement.tagName === 'INPUT' ? document.activeElement : null;
        }

        if (input) {
            console.log("[eBay AutoLister] Typing value...");
            input.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set || 
                               Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
            if (nativeSetter) { nativeSetter.call(input, value); } else { input.value = value; }
            
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise(r => setTimeout(r, 1200));

            // Select from result list if it appeared
            const options = Array.from(document.querySelectorAll('.search-box-attributes__suggestion, .autocomplete__option, [role="option"], .listbox__option, .menu__item'))
                .filter(o => o.offsetParent !== null);
                
            if (options.length > 0) {
                const match = options.find(o => o.innerText.toLowerCase().includes(String(value).toLowerCase())) || options[0];
                console.log("[eBay AutoLister] Selecting from list:", match.innerText);
                match.click();
                await new Promise(r => setTimeout(r, 800));
            } else {
                input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13 }));
                await new Promise(r => setTimeout(r, 1000));
            }
            return true;
        }

        return false;
    } catch(e) { 
        console.error("[eBay AutoLister] Error in setInputValue:", e);
        return false; 
    }
}


// --- UTILITY: CONDITION MATCHER ---
function findBestConditionMatch(elements, dbConditionText) {
    if (!dbConditionText) return null;
    
    const cleanDb = dbConditionText.toLowerCase().split(':')[0].replace(/[*:]/g, '').trim();
    const dbWords = cleanDb.split(/\s+/).filter(w => w.length > 2);
    const isUsed = cleanDb.includes("used") || cleanDb.includes("pre-owned") || cleanDb.includes("worn");

    console.log(`[eBay AutoLister] 🔍 Searching for condition match: "${cleanDb}" (Keywords: ${dbWords.join(', ')})`);

    // Level 1: Exact Match
    let match = elements.find(el => {
        const text = el.innerText?.toLowerCase().trim();
        return text === cleanDb && el.offsetParent !== null;
    });
    if (match) return match;

    // Level 2: Substring Match (element text is inside db text or vice-versa)
    match = elements.find(el => {
        const text = el.innerText?.toLowerCase().trim();
        if (!text || el.offsetParent === null) return false;
        return (cleanDb.includes(text) || text.includes(cleanDb)) && (text.length > 2);
    });
    if (match) return match;

    // Level 3: Keyword Intersection
    match = elements.find(el => {
        const text = el.innerText?.toLowerCase().trim();
        if (!text || el.offsetParent === null) return false;
        const elWords = text.split(/\s+/).filter(w => w.length > 2);
        return elWords.some(w => dbWords.includes(w));
    });
    if (match) return match;

    // Level 4: Category Fallback (Select the first visible option in the same category)
    // Level 5: Pure Fallback (Select the first visible option that seems like a choice)
    return elements.find(el => {
        const text = el.innerText?.toLowerCase().trim();
        return text && text.length > 2 && text.length < 40 && el.offsetParent !== null;
    });
}



// --- FEATURE 1: AUTO SEARCH ---
function handleSuggestPage(productData) {
    if (!window.location.href.includes("prelist/suggest")) return;
    const gateKey = 'search_done_' + btoa(productData.title).substring(0, 8);
    if (getPageState(gateKey)) return;

    const input = document.querySelector('input[placeholder*="selling"], input.textbox__control, #keyword');
    const searchBtn = document.querySelector('button.keyword-suggestion__button, button[aria-label*="Search" i], .btn--primary');

    if (input && input.value.trim().length === 0) {
        setInputValue(input, productData.title);
        setPageState(gateKey, "true"); 
        setTimeout(() => { if (searchBtn && !searchBtn.disabled) searchBtn.click(); }, 1500); 
    }
}

// --- FEATURE 2: AUTO IDENTIFY ---
function handleIdentifyPage(productData) {
    if (!window.location.href.includes("prelist/identify")) return;
    const gateKey = 'match_done_' + btoa(productData.title).substring(0, 8);
    if (getPageState(gateKey)) return;

    const noMatchBtn = Array.from(document.querySelectorAll('button, span')).find(el => 
        /continue without match|skip/i.test(el.innerText) && el.offsetParent !== null
    );

    if (noMatchBtn) {
        const clickable = noMatchBtn.closest('button') || noMatchBtn;
        setPageState(gateKey, "true"); 
        clickable.click();
    }
}

// --- FEATURE 3: AUTO CONDITION ---
function handleConditionPage(productData) {
    const isConditionPage = window.location.href.includes("/condition") || document.querySelector('h1')?.innerText.toLowerCase().includes("condition");
    if (!isConditionPage) return;
    const gateKey = 'cond_done_' + btoa(productData.title).substring(0, 8);
    if (getPageState(gateKey)) return;


    const dbCondition = (productData.condition_name || productData.condition || "");
    const elements = Array.from(document.querySelectorAll('span, div, label, button, .radio__label, .ux-selection-box__label, .ux-selection-box__text, .ux-selection-box'));
    
    const match = findBestConditionMatch(elements, dbCondition);

    if (match) {
        console.log(`[eBay AutoLister] ✅ Selecting Condition: ${match.innerText.trim()}`);
        const clickable = match.closest('button') || match.closest('[role="radio"]') || match.closest('.ux-selection-box') || match;
        setPageState(gateKey, "true"); 
        clickable.click();
    } else {
        console.warn(`[eBay AutoLister] ❌ No candidate found for: ${dbCondition}`);
    }
}




// --- FEATURE 4: MAIN FORM FILLING ---
function getStorage(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => resolve(result[key]));
    });
}

async function fillTitlePrice() {
    const productData = await getStorage("ebayDraftData");
    if (!productData) return alert("No data found!");
    showStatus("⚡ Filling Title & Price...", "info");
    
    // Title
    console.log("[eBay AutoLister] Title:", productData.title);
    await setInputValue('input[name="title"], input[id*="title"], #title, [aria-label*="Title" i], [data-testid*="title"] input', productData.title);
    
    // Price Handling (Based on your HTML)
    const priceStr = String(productData.selling_price || productData.retail_price || "");
    const price = priceStr.replace(/[^\d.]/g, '');
    console.log("[eBay AutoLister] Injecting Price:", price);

    if (price && price !== "0") {
        const priceSelectors = [
            'input[name="price"].textbox__control', 
            'input[aria-label="Item price"]',
            '[data-testid$="price"] input',
            '#price'
        ];
        
        let priceInp = document.querySelector(priceSelectors.join(','));
        
        if (!priceInp) {
            await ensureBuyItNowFormat();
            await new Promise(r => setTimeout(r, 1000));
            priceInp = document.querySelector(priceSelectors.join(','));
        }

        if (priceInp) {
            priceInp.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            if (nativeSetter) { nativeSetter.call(priceInp, price); } else { priceInp.value = price; }
            
            ['input', 'change', 'blur'].forEach(e => priceInp.dispatchEvent(new Event(e, { bubbles: true })));
            console.log("[eBay AutoLister] Price set successfully.");
        }
    }


    // Condition Selection - Ultra Hybrid Matcher
    const dbCondition = (productData.condition_name || productData.condition || "");
    const isUsed = dbCondition.toLowerCase().includes("used") || dbCondition.toLowerCase().includes("pre-owned") || dbCondition.toLowerCase().includes("worn");
    
    const condTrigger = Array.from(document.querySelectorAll('button, .ux-selection-box'))
        .find(b => {
            const text = b.innerText.toLowerCase();
            return (text.includes("condition") || text.includes("new") || text.includes("used") || text.includes("pre-owned")) && b.offsetParent !== null;
        });
    
    if (condTrigger) {
        const current = condTrigger.innerText.toLowerCase();
        const isCurrentCorrect = isUsed ? (current.includes("used") || current.includes("pre-owned") || current.includes("worn")) : (!current.includes("used") && !current.includes("pre-owned") && current.includes("new"));

        if (!isCurrentCorrect) {
            console.log(`[eBay AutoLister] Triggering condition menu...`);
            condTrigger.click();
            await new Promise(r => setTimeout(r, 1200));
            
            const options = Array.from(document.querySelectorAll('.listbox__option, [role="option"], label, .menu__item, .ux-selection-box, .ux-selection-box__text'));
            const match = findBestConditionMatch(options, dbCondition);

            if (match) {
                console.log(`[eBay AutoLister] Selecting best condition match: ${match.innerText.trim()}`);
                match.click();
                await new Promise(r => setTimeout(r, 1000));
            }
        } else {
            console.log(`[eBay AutoLister] Condition already looks correct (${current}). Skipping.`);
        }
    }


    showStatus("✅ Title, Price & Condition Done!", "success");
}

async function fillDescriptionStep() {
    const productData = await getStorage("ebayDraftData");
    if (!productData) return;
    showStatus("⚡ Injecting Description...", "info");
    const htmlContent = productData.description || productData.about_item || productData.title;
    const editors = document.querySelectorAll('.ck-editor__editable, [contenteditable="true"][aria-label*="Description" i], #desc_wrapper [contenteditable="true"]');
    editors.forEach(editor => {
        editor.focus(); editor.click(); editor.innerHTML = htmlContent;
        ['input', 'change', 'blur'].forEach(evtType => editor.dispatchEvent(new Event(evtType, { bubbles: true })));
    });
    document.querySelectorAll('iframe').forEach(iframe => {
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            const body = doc.body;
            if (body && (body.getAttribute('contenteditable') === 'true' || iframe.title?.toLowerCase().includes('description'))) {
                body.focus(); body.innerHTML = htmlContent;
                ['input', 'change', 'blur'].forEach(evtType => body.dispatchEvent(new Event(evtType, { bubbles: true })));
            }
        } catch(e) {}
    });
    showStatus("✅ Description Done!", "success");
}

async function fillImagesStep() {
    const productData = await getStorage("ebayDraftData");
    if (!productData || !productData.images) return;
    showStatus("⚡ Uploading Images...", "info");
    const fileInput = document.querySelector('input[type="file"][accept*="image"]');
    if (fileInput) {
        const dataTransfer = new DataTransfer();
        for (let i = 0; i < productData.images.slice(0, 12).length; i++) {
            const res = await new Promise(r => chrome.runtime.sendMessage({ action: "fetchImageBlob", url: productData.images[i] }, r));
            if (res?.dataUrl) {
                const r = await fetch(res.dataUrl);
                const blob = await r.blob();
                dataTransfer.items.add(new File([blob], `image_${i}.jpg`, {type:'image/jpeg'}));
            }
        }
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', {bubbles:true}));
    }
    showStatus("✅ Images Queued!", "success");
}

async function fillSpecificsStep() {
    console.log("[eBay AutoLister] ⚙️ Starting Item Specifics (Confirmed Working Version)...");
    const productData = await getStorage("ebayDraftData");
    if (!productData) return alert("Product data not found!");
    showStatus("⚡ Filling Item Specifics...", "info");
    
    // 1. Expand "Show More"
    const moreBtn = Array.from(document.querySelectorAll('button')).find(b => 
        ["show more", "see all", "view more", "more aspects"].some(t => b.innerText.toLowerCase().includes(t)) && b.offsetParent !== null
    );
    if (moreBtn) { moreBtn.click(); await new Promise(r => setTimeout(r, 1000)); }

    let specifics = productData.item_specifics || {};
    if (typeof specifics === 'string') try { specifics = JSON.parse(specifics); } catch(e) {}
    
    if (productData.brand) specifics["Brand"] = productData.brand;
    if (productData.color) specifics["Color"] = productData.color;
    if (productData.size) specifics["Size"] = productData.size;

    const requiredPriority = ["brand", "type", "size", "color", "department", "style"];
    const aliases = {
        "brand": ["brand", "brand name", "manufacturer"],
        "size": ["size type", "size", "shoe size", "chest size", "size (men's)"],
        "color": ["colour", "color", "main color"],
        "material": ["material", "outer shell material", "fabric type"],
        "style": ["style", "theme", "design", "jacket style", "sweatshirt type"],
        "department": ["department", "gender", "section"],
        "type": ["type", "product type"]
    };

    const ignoreKeys = ['price', 'retail_price', 'selling_price', 'msrp', 'list price', 'shipping', 'delivery', 'returns', 'import fees', 'estimated total', 'ebayurl', 'ebay_url'];
    const filledKeys = new Set();

    const getLabelForField = (field) => {
        let labelText = "";
        const container = field.closest('.ux-labels-values, .summary__attributes--field, [data-testid="attribute"], .form-field, .aspect-name, .field-container, .ui-form-element, .ux-combobox, .selection-list');
        if (container) {
            // Check for specific eBay aspect class (e.g., ux-labels-values--style)
            const aspectClass = Array.from(container.classList).find(c => c.startsWith('ux-labels-values--'));
            if (aspectClass) {
                labelText = aspectClass.split('--')[1].replace(/-/g, ' ');
            } else {
                labelText = container.querySelector('label, .ux-labels-values__labels-content, .aspect-name, span[class*="label"], .summary__attributes--label, .field-label, .ux-combobox__label, h3')?.innerText || "";
            }
        }
        if (!labelText) labelText = field.getAttribute('aria-label') || field.placeholder || field.name || "";
        return labelText.toLowerCase().replace(/[*:]/g, '').trim().split('\n')[0];
    };

    const allFields = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, [role="combobox"], button[name^="attributes."], [data-testid="attribute"] button, .ux-combobox input'));

    // --- PHASE 1: FILL EXISTING FIELDS ---
    console.log("[eBay AutoLister] Phase 1: Filling Required Fields first...");
    for (const priorityKey of requiredPriority) {
        const actualKey = Object.keys(specifics).find(k => k.toLowerCase() === priorityKey || k.toLowerCase().includes(priorityKey));
        let val = actualKey ? specifics[actualKey] : productData[priorityKey];
        if (!val && priorityKey === "size") val = specifics["Size (Men's)"] || specifics["Size Type"];
        if (!val) continue;

        const targetMatches = [priorityKey, ...(aliases[priorityKey] || [])];
        let targetField = null;

        // Try direct matching first
        for (const field of allFields) {
            const label = getLabelForField(field);
            if (targetMatches.some(m => label === m || (label.includes(m) && label.length < m.length + 5))) {
                targetField = field;
                break;
            }
        }

        // If not found, try finding by specific container class (based on user snippet)
        if (!targetField) {
            const container = document.querySelector(`.ux-labels-values--${priorityKey}, .ux-labels-values--${priorityKey.replace(/\s/g, '-')}`);
            if (container) {
                targetField = container.querySelector('input:not([type="hidden"]), textarea, [role="combobox"], button') || container.querySelector('.ux-textspans');
            }
        }

        if (targetField) {
            const finalVal = Array.isArray(val) ? val[0] : val;
            console.log(`[eBay AutoLister] Filling Priority: ${priorityKey} -> ${finalVal}`);
            const success = await setInputValue(targetField, finalVal);
            if (success) {
                filledKeys.add(priorityKey);
                if (actualKey) filledKeys.add(actualKey);
                await new Promise(r => setTimeout(r, 500));
            }
        }
    }

    // Fill remaining fields that were not in priority
    for (const field of allFields) {
        const labelText = getLabelForField(field);
        if (!labelText || labelText.includes("search") || labelText.includes("price")) continue;

        for (const [key, val] of Object.entries(specifics)) {
            const cleanKey = key.toLowerCase().replace(/[*:]/g, '').trim();
            if (filledKeys.has(key) || ignoreKeys.some(ik => cleanKey.includes(ik))) continue;

            const matches = [cleanKey, ...(aliases[cleanKey] || [])];
            if (matches.some(m => labelText === m || (labelText.includes(m) && labelText.length < m.length + 5))) {
                const finalVal = Array.isArray(val) ? val[0] : val;
                const success = await setInputValue(field, finalVal);
                if (success) {
                    filledKeys.add(key);
                    await new Promise(r => setTimeout(r, 400));
                }
            }
        }
    }

    // --- PHASE 2: ADD CUSTOM ---
    const remaining = Object.keys(specifics).filter(k => !filledKeys.has(k) && specifics[k] && !ignoreKeys.some(ik => k.toLowerCase().includes(ik)));
    if (remaining.length > 0) {
        for (const key of remaining) {
            const addBtn = Array.from(document.querySelectorAll('button, .ux-action-link, span')).find(b => ["add custom", "add specific", "add an aspect"].some(t => b.innerText.toLowerCase().includes(t)) && b.offsetParent !== null);
            if (!addBtn) break;
            
            addBtn.click();
            await new Promise(r => setTimeout(r, 1200));
            const modal = document.querySelector('[role="dialog"], .lightbox-dialog');
            if (modal) {
                const inputs = Array.from(modal.querySelectorAll('input:not([type="hidden"])')).filter(i => i.offsetParent !== null);
                if (inputs.length >= 2) {
                    await setInputValue(inputs[0], key);
                    await setInputValue(inputs[1], String(specifics[key]));
                    const save = Array.from(modal.querySelectorAll('button')).find(b => ["save", "add", "confirm", "done"].some(t => b.innerText.toLowerCase().includes(t)));
                    if (save) { save.click(); await new Promise(r => setTimeout(r, 1500)); }
                }
            }
        }
    }
    showStatus("✅ Item Specifics Done!", "success");
}

// --- FEATURE 5: VARIATIONS WIZARD AUTOMATION ---
let isHandlingVariations = false;

async function handleVariationsWizard(productData) {
    if (isHandlingVariations) return;
    
    const isInsideIframe = window.location.href.includes("bulkedit.ebay.com/msku");
    const wizardModal = document.querySelector('.variation-wizard, .modal-dialog, .msku-dialog, .variations-v3-overlay');
    
    if (!isInsideIframe && !wizardModal) return;

    isHandlingVariations = true;
    const modal = isInsideIframe ? document.body : wizardModal;
    console.log("[eBay AutoLister] 🎭 Variation Engine Started");
    showStatus("🎭 Starting Variations...", "success");
    
    try {
        await new Promise(r => setTimeout(r, 1500)); 
        const variations = productData.variations || [];
        
        if (variations.length === 0) {
            showStatus("⚠️ No variations data found!", "error");
            return;
        }

        for (const v of variations) {
            showStatus(`🔍 Looking for attribute: "${v.name}"`, "info");
            
            // 1. SELECT ATTRIBUTE TAB
            const allElements = Array.from(modal.querySelectorAll('button, span, div, .ux-action-link, .msku-attribute'));
            let attrLink = allElements.find(el => {
                const text = el.innerText.trim().toLowerCase();
                const target = v.name.toLowerCase();
                return text.startsWith(target) && el.offsetParent !== null;
            });
            
            if (!attrLink) {
                console.log(`[eBay AutoLister] Attribute "${v.name}" not found. Trying to add...`);
                showStatus(`➕ Adding missing attribute: "${v.name}"`, "info");
                const addBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes("+ add") && b.offsetParent !== null);
                if (addBtn) {
                    addBtn.click(); await new Promise(r => setTimeout(r, 1500));
                    const attrModal = document.querySelector('.msku-dialog, [role="dialog"], .se-dialog');
                    if (attrModal) {
                        const labels = Array.from(attrModal.querySelectorAll('label, .checkbox__label'));
                        const match = labels.find(l => l.innerText.toLowerCase().trim() === v.name.toLowerCase());
                        if (match) {
                            console.log(`[eBay AutoLister] Selecting existing attribute checkbox: ${v.name}`);
                            match.click(); 
                        }
                        else {
                            console.log(`[eBay AutoLister] Creating custom attribute: ${v.name}`);
                            const own = labels.find(l => l.innerText.toLowerCase().includes("add your own"));
                            if (own) { 
                                own.click(); await new Promise(r => setTimeout(r, 800));
                                const inp = attrModal.querySelector('input[type="text"]');
                                if (inp) await setInputValue(inp, v.name);
                            }
                        }
                        const save = Array.from(attrModal.querySelectorAll('button')).find(b => /Save|Add|Done/i.test(b.innerText));
                        if (save) { 
                            save.click(); await new Promise(r => setTimeout(r, 2000)); 
                        }
                    }
                }
                attrLink = Array.from(modal.querySelectorAll('button, span')).find(el => el.innerText.trim().toLowerCase().startsWith(v.name.toLowerCase()) && el.offsetParent !== null);
            }

            if (attrLink) {
                console.log(`[eBay AutoLister] Activating attribute tab: ${v.name}`);
                attrLink.click();
                await new Promise(r => setTimeout(r, 1200)); 
                
                // 2. SELECT VALUES
                for (const val of v.values) {
                    showStatus(`👉 Looking for value: "${val}"`, "info");
                    const possibleChips = Array.from(modal.querySelectorAll('.msku-chip, button, .ux-selection-box'));
                    const match = possibleChips.find(o => {
                        const text = (o.innerText || "").trim().toLowerCase();
                        return text === val.toLowerCase() || (text.includes(val.toLowerCase()) && text.length < val.length + 5);
                    });
                    
                    if (match) {
                        const btn = match.tagName === 'BUTTON' ? match : match.closest('button, .ux-selection-box') || match;
                        const isChecked = btn.getAttribute('aria-pressed') === 'true' || 
                                          btn.classList.contains('selected') || 
                                          btn.classList.contains('checked');

                        if (!isChecked) {
                            console.log(`[eBay AutoLister] Clicking value: ${val}`);
                            btn.click();
                            // Fallback for tricky buttons
                            setTimeout(() => { 
                                if (btn.getAttribute('aria-pressed') !== 'true' && !btn.classList.contains('selected') && !btn.classList.contains('checked')) {
                                    btn.dispatchEvent(new Event('click', {bubbles: true})); 
                                }
                            }, 100);
                            await new Promise(r => setTimeout(r, 600));
                        } else {
                            console.log(`[eBay AutoLister] Value "${val}" already selected.`);
                        }
                    } else {
                        showStatus(`➕ Creating custom value: "${val}"`, "info");
                        console.log(`[eBay AutoLister] Value "${val}" not found. Creating custom...`);
                        const create = Array.from(modal.querySelectorAll('button, span, a')).find(b => ["create your own", "add custom", "+ add"].some(t => b.innerText.toLowerCase().includes(t)) && b.offsetParent !== null);
                        if (create) {
                            create.click(); await new Promise(r => setTimeout(r, 1000));
                            const inp = modal.querySelector('input[type="text"]');
                            if (inp) {
                                await setInputValue(inp, val);
                                const addB = modal.querySelector('button[aria-label*="Add" i], .add-button, button.btn--primary');
                                if (addB) { addB.click(); await new Promise(r => setTimeout(r, 1200)); }
                            }
                        }
                    }
                }
                const done = Array.from(modal.querySelectorAll('button')).find(b => /Update|Done|Close/i.test(b.innerText) && b.offsetParent !== null);
                if (done) { 
                    console.log(`[eBay AutoLister] Clicking "Done" for attribute: ${v.name}`);
                    done.click(); 
                    await new Promise(r => setTimeout(r, 1200)); 
                }
            }
        }

        showStatus("🏁 Moving to Prices & Qty...", "info");
        console.log("[eBay AutoLister] Moving to next step (Continue/Next)...");
        const next = Array.from(modal.querySelectorAll('button')).find(b => (b.innerText.toLowerCase().includes("continue") || b.innerText.toLowerCase().includes("next")) && b.offsetParent !== null);
        if (next) { 
            next.click(); 
            await new Promise(r => setTimeout(r, 2000)); 
        } else {
            console.warn("[eBay AutoLister] 'Continue' or 'Next' button not found. Assuming already on grid or final step.");
        }

        showStatus("💰 Filling Grid...", "info");
        console.log("[eBay AutoLister] Filling prices and quantities in the variations grid...");
        const rows = Array.from(modal.querySelectorAll('tr, [role="row"]')).filter(r => r.querySelector('input'));
        for (const row of rows) {
            const rowText = row.innerText.toLowerCase();
            const matchingVar = (productData.variations_table || []).find(vt => {
                const comboVals = Object.values(vt.combination || {}).map(cv => String(cv).toLowerCase());
                return comboVals.every(cv => rowText.includes(cv));
            });
            if (matchingVar) {
                const inputs = Array.from(row.querySelectorAll('input'));
                const priceInp = inputs.find(i => /price/i.test(i.name || i.getAttribute('aria-label') || ""));
                const qtyInp = inputs.find(i => /quantity|qty/i.test(i.name || i.getAttribute('aria-label') || ""));
                if (priceInp) {
                    console.log(`[eBay AutoLister] Setting price for variation: ${matchingVar.price}`);
                    await setInputValue(priceInp, matchingVar.price);
                }
                if (qtyInp) {
                    console.log(`[eBay AutoLister] Setting quantity for variation: ${matchingVar.quantity || "1"}`);
                    await setInputValue(qtyInp, matchingVar.quantity || "1");
                }
            }
        }
        showStatus("✅ Variations Complete!", "success");
        console.log("[eBay AutoLister] 🎭 Variations Wizard Process Completed.");
    } catch(e) { 
        console.error("[eBay AutoLister] Wizard Error:", e); 
        showStatus("❌ Variations Fill Failed!", "error");
    } finally { 
        isHandlingVariations = false; 
    }
}

async function performVariationsFill() {
    console.log("[eBay AutoLister] 🎭 MANUAL VARIATIONS INITIATED");
    const productData = await getStorage("ebayDraftData");
    if (!productData || !productData.variations) return alert("No variations data found!");
    showStatus("⚡ Detecting Wizard...", "info");
    
    // Precise button detection: Strictly scope to the Variations section
    const varSection = document.querySelector('.summary__variations, [data-testid="variations-section"]');
    let varBtn = null;

    if (varSection) {
        console.log("[eBay AutoLister] Searching for Edit button inside Variations section...");
        // Find the button inside the variations section that mentions "variation"
        varBtn = Array.from(varSection.querySelectorAll('button, a')).find(el => {
            const text = (el.innerText || "").toLowerCase();
            const label = (el.getAttribute('aria-label') || "").toLowerCase();
            return (text.includes("variation") || label.includes("variation")) && el.offsetParent !== null;
        });
        
        // Final fallback within section: the main edit button class
        if (!varBtn) varBtn = varSection.querySelector('.summary__header-edit-button');
    }

    if (!varBtn) {
        console.warn("[eBay AutoLister] Variations Edit button not found within the expected section.");
    }
    
    if (varBtn) {
        varBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        varBtn.click();
        
        // Wait for modal OR iframe to appear
        let attempts = 0;
        const checkModal = setInterval(async () => {
            const wizard = document.querySelector('.variation-wizard, .modal-dialog, .msku-dialog, iframe[src*="bulkedit.ebay.com"]');
            if (wizard) {
                clearInterval(checkModal);
                // Note: If it's an iframe, the internal instance of this script will take over via the global loop below
                if (wizard.tagName !== 'IFRAME') await handleVariationsWizard(productData);
            }
            if (++attempts > 20) clearInterval(checkModal);
        }, 1000);
    } else {
        alert("Variations 'Edit' button not found. Please ensure 'Variations' section is visible.");
    }
}

// --- FULL FILL COORDINATOR ---
let isFiling = false;

async function performFullFill() {
    if (isFiling) return;
    isFiling = true;
    console.log("[eBay AutoLister] 🚀 FULL FILL INITIATED");

    try {
        await fillTitlePrice();
        await new Promise(r => setTimeout(r, 1000));
        await fillDescriptionStep();
        await new Promise(r => setTimeout(r, 1000));
        await fillImagesStep();
        await new Promise(r => setTimeout(r, 1000));
        await fillSpecificsStep();
        showStatus("🚀 All Steps Completed!", "success");
    } catch (e) {
        console.error("Full Fill Error:", e);
        showStatus("❌ Full Fill Failed!", "error");
    } finally {
        isFiling = false;
    }
}

function showStatus(msg, type = "info") {
    let overlay = document.getElementById('ebay-status-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'ebay-status-overlay';
        overlay.style.cssText = 'position:fixed; top:15px; left:50%; transform:translateX(-50%); z-index:9999999; padding:8px 20px; border-radius:10px; font-weight:500; font-size:14px; box-shadow:0 4px 15px rgba(0,0,0,0.15); transition:all 0.3s ease; pointer-events:none; border:1px solid rgba(255,255,255,0.1); backdrop-filter:blur(8px);';
        document.body.appendChild(overlay);
    }
    // Deep emoji stripping
    overlay.innerText = msg.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    overlay.style.background = type === "success" ? "rgba(34, 197, 94, 0.9)" : type === "error" ? "rgba(239, 68, 68, 0.9)" : "rgba(31, 41, 55, 0.9)";
    overlay.style.color = "white";
    overlay.style.opacity = "1";
    overlay.style.top = "20px";
    setTimeout(() => { if (overlay) { overlay.style.opacity = "0"; overlay.style.top = "10px"; } }, 4000);
}

function createManualButton(productData) {
    if (document.getElementById('ebay-autofill-container')) return;
    const isListingPage = window.location.href.includes("/sl/list/") || window.location.href.includes("/lstng") || window.location.href.includes("/drafts/");
    if (!isListingPage) return;

    const container = document.createElement('div');
    container.id = 'ebay-autofill-container';
    container.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:999999; display:flex; flex-direction:column; gap:6px; background:rgba(255,255,255,0.85); padding:10px; border-radius:16px; box-shadow:0 8px 32px rgba(0,0,0,0.1); backdrop-filter:blur(10px); border:1px solid rgba(0,0,0,0.05); width:170px;';

    const createBtn = (text, color, action) => {
        const btn = document.createElement('button');
        btn.innerText = text; // No icon span
        btn.style.cssText = `padding:8px 12px; background:${color}; color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; font-size:11px; transition:all 0.2s; width:100%; text-align:center; text-transform:uppercase; letter-spacing:0.4px;`;
        btn.onmouseenter = () => { btn.style.transform = 'translateY(-1px)'; btn.style.filter = 'brightness(1.05)'; };
        btn.onmouseleave = () => { btn.style.transform = 'translateY(0)'; btn.style.filter = 'brightness(1.0)'; };
        btn.onclick = action;
        return btn;
    };

    container.appendChild(createBtn('FULL AUTO FILL', 'linear-gradient(135deg, #4F46E5, #3730A3)', performFullFill));
    container.appendChild(createBtn('Title & Price', '#1F2937', fillTitlePrice));
    container.appendChild(createBtn('Description', '#374151', fillDescriptionStep));
    container.appendChild(createBtn('Upload Photos', '#4B5563', fillImagesStep));
    container.appendChild(createBtn('Item Specifics', '#6B7280', fillSpecificsStep));

    if (productData.variations && productData.variations.length > 0) {
        container.appendChild(createBtn('Fill Variations', '#D97706', performVariationsFill));
    }

    document.body.appendChild(container);
}

// --- AUTOMATION GATE ---
setInterval(async () => {
    if (!chrome.runtime?.id) return;
    
    const productData = await getStorage("ebayDraftData");
    if (!productData) return;

    // 1. HIGHEST PRIORITY: WIZARD/MODAL (Check every 3s)
    const isIframeWizard = window.location.href.includes("bulkedit.ebay.com");
    const wizardModal = document.querySelector('.variation-wizard, .modal-dialog, .msku-dialog, .variations-v3-overlay');
    const hasWizardTitle = document.body.innerText.includes("Create your variations") || document.body.innerText.includes("Edit Variations");

    if (isIframeWizard || wizardModal || hasWizardTitle) {
        console.log("[eBay AutoLister] 🎭 Wizard/Modal detected in loop. Triggering auto-fill...");
        handleVariationsWizard(productData);
        return; // Don't do other things if we are in the wizard
    }

    // 2. MAIN LISTING & BRIDGE PAGES
    const isMainListing = window.location.href.includes("/sl/list/") || window.location.href.includes("/lstng") || window.location.href.includes("/drafts/");

    handleSuggestPage(productData);
    handleIdentifyPage(productData);
    handleConditionPage(productData);

    if (isMainListing) {
        createManualButton(productData); 
        
        if (!getPageState('format_fixed')) {
            const success = await ensureBuyItNowFormat(); 
            if (success) {
                const trigger = document.querySelector('.pricing-format button, [role="combobox"]');
                if (trigger && trigger.innerText.toLowerCase().includes("buy it now")) {
                    setPageState('format_fixed', 'true');
                }
            }
        }
    }
}, 3000);
