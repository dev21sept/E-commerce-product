console.log("[eBay AutoLister] Content script active!");

// --- STORAGE-BASED STATE (PERSISTS REFRESHES) ---
function getPageState(key) { return sessionStorage.getItem('ebay_lister_' + key); }
function setPageState(key, val) { sessionStorage.setItem('ebay_lister_' + key, val); }

// --- UTILITY: Simulation (Human-like Typing & Selecting) ---
async function setInputValue(selectorOrEl, value) {
    const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!el || el.disabled) return false;

    try {
        // 1. Open the box to trigger the type 'dropdown'
        el.focus();
        el.click();
        await new Promise(r => setTimeout(r, 600)); // increased wait for React to spawn search
        
        let typingBox = el;
        
        // 1.5. CHECK IF EBAY OPENED AND FOCUSED A DEDICATED SEARCH BOX ON CLICK
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            typingBox = document.activeElement;
            console.log("[eBay AutoLister] Intercepted auto-focused search box.");
        } else {
            const activeSearch = Array.from(document.querySelectorAll('input.search-box-attributes__input, [role="combobox"][aria-expanded="true"] input, .listbox__control input, input[aria-autocomplete="list"]:not([hidden])'))
                .find(input => input.offsetParent !== null && !input.disabled);
                
            if (activeSearch) {
                typingBox = activeSearch;
                typingBox.focus();
                typingBox.click();
            } else if (typingBox.tagName !== 'INPUT' && typingBox.tagName !== 'TEXTAREA' && typingBox.tagName !== 'SELECT') {
                // Fallback: If no global search box popped up, look inside the combobox container itself
                const inner = typingBox.querySelector('input:not([type="hidden"])');
                if (inner) {
                    typingBox = inner;
                    typingBox.focus();
                    typingBox.click();
                }
            }
        }

        // 2. Insert the actual text value 
        if (typingBox.tagName === 'INPUT' || typingBox.tagName === 'TEXTAREA' || typingBox.tagName === 'SELECT') {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set || 
                               Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set ||
                               Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
            
            if (nativeSetter) { nativeSetter.call(typingBox, value); } 
            else { typingBox.value = value; }

            // 3. Dispatch an 'input' event so eBay brings up its dropdown options
            typingBox.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        }
        
        // 4. Wait for the eBay servers to fetch and show the dropdown suggestions
        await new Promise(r => setTimeout(r, 1200));

        // Also fire an Enter key to lock-in text if no suggestion appears
        typingBox.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13 }));
        
        // 5. User's Idea: Find the first dropdown option and select it
        const options = Array.from(document.querySelectorAll('.search-box-attributes__suggestion, .autocomplete__option, .menu-button__item, [role="option"], .listbox__option'))
            .filter(o => o.offsetParent !== null && o.innerText && !o.innerText.toLowerCase().includes("add custom")); // Skip "Add custom" buttons inside dropdowns

        if (options.length > 0) {
            let bestMatch = options.find(s => (s.innerText || "").toLowerCase().trim() === String(value).toLowerCase().trim());
            if (!bestMatch) {
                bestMatch = options[0]; // Select the very first option from dropdown
            }

            console.log("[eBay AutoLister] Clicking Dropdown Option:", bestMatch.innerText, "for box:", value);
            try { 
                bestMatch.focus();
                bestMatch.click(); 
            } catch(e) {}
            await new Promise(r => setTimeout(r, 400));
        }

        // Finish up
        if (typingBox.tagName === 'INPUT' || typingBox.tagName === 'TEXTAREA' || typingBox.tagName === 'SELECT') {
            typingBox.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
            typingBox.blur();
        }
        
        // Close dropdown
        try { document.body.click(); } catch(e) {}
        
        // Wait sequence complete before returning
        await new Promise(r => setTimeout(r, 300));
        return true;
    } catch(e) {
        console.error("[eBay AutoLister] Simulation background error:", e);
        return false;
    }
}

// --- POPUP CLEANER ---
function closeUnwantedPopups() {
    const closeSelectors = ['button[aria-label="Close"]', 'button[aria-label="Close dialog"]', 'button.lightbox-dialog__close', 'button.dialog__close'];
    closeSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(btn => {
            const isCustomModal = btn.closest('div[role="dialog"]')?.innerText?.toLowerCase().includes("add custom item specific");
            if (btn.offsetParent !== null && !isCustomModal) try { btn.click(); } catch(e) {}
        });
    });
}

// --- FEATURE 1: AUTO SEARCH ---
function handleSuggestPage(productData) {
    if (!window.location.href.includes("prelist/suggest")) return;
    const gateKey = 'search_done_' + btoa(productData.title).substring(0, 16);
    if (getPageState(gateKey)) return;

    const input = document.querySelector('input[placeholder*="selling"], input.textbox__control, #keyword');
    const searchBtn = document.querySelector('button.keyword-suggestion__button, button[aria-label="Search"], .btn--primary');

    if (input && input.value.trim().length === 0) {
        setInputValue(input, productData.title);
        setPageState(gateKey, "true"); 
        setTimeout(() => { if (searchBtn && !searchBtn.disabled) searchBtn.click(); }, 2000); 
    }
}

// --- FEATURE 2: AUTO IDENTIFY ---
function handleIdentifyPage(productData) {
    if (!window.location.href.includes("prelist/identify")) return;
    const gateKey = 'match_done_' + btoa(productData.title).substring(0, 16);
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
    const gateKey = 'cond_done_' + btoa(productData.title).substring(0, 16);
    if (getPageState(gateKey)) return;

    let cond = (productData.condition_name || "").toLowerCase();
    const priorities = ["new with tags", "new with box", "new without tags", "new without box", "brand new", "new", "pre-owned", "used"];
    let target = priorities.find(p => cond.includes(p)) || "";

    if (target) {
        const elements = Array.from(document.querySelectorAll('span, div, label, button, .radio__label'));
        let match = elements.find(el => el.innerText?.toLowerCase().trim() === target) ||
                    elements.find(el => el.innerText?.toLowerCase().includes(target) && el.innerText.length < 40);

        if (match) {
            const clickable = match.closest('button') || match.closest('[role="radio"]') || match.closest('.radio') || match;
            if (clickable.getAttribute('aria-checked') !== 'true' && clickable.getAttribute('aria-pressed') !== 'true') {
                clickable.click();
                setPageState(gateKey, "true"); 
            }
        }
    }
}

// --- FEATURE 4: MAIN FORM FILLING ---
function performFullFill() {
    if (!chrome.runtime?.id) {
        alert("Extension context invalidated. Please refresh this eBay page.");
        return;
    }
    try {
        chrome.storage.local.get("ebayDraftData", async (result) => {
            if (chrome.runtime.lastError) return;
            const productData = result.ebayDraftData;
            if (!productData) return alert("No data found! Send to eBay from Admin first.");

        console.log("[eBay AutoLister] Starting full fill...");

        // 0. Enforce "Buy It Now" format to unlock variations globally
        console.log("[eBay AutoLister] Waiting for Pricing Format component to load...");
        
        const waitForFormatAndSwitch = async () => {
            let attempts = 0;
            while (attempts < 20) {
                // Best-way approach: Find the hidden native select or its container by name
                const formatSelect = document.querySelector('select[name="format"]');
                if (formatSelect) {
                    const container = formatSelect.closest('.se-field, .listbox-button');
                    if (container) {
                        const formatBtn = container.querySelector('button[aria-haspopup="listbox"]');
                        if (formatBtn) {
                            const btnText = (formatBtn.innerText || formatBtn.textContent || "").toLowerCase();
                            
                            if (btnText.includes("auction")) {
                                console.log("[eBay AutoLister] Exact match found for 'Auction' Format via select[name='format']. Clicking...");
                                formatBtn.focus();
                                formatBtn.click();
                                
                                // Wait for eBay to animate/open listbox
                                await new Promise(r => setTimeout(r, 600));
                                
                                // Find exactly which listbox opened using aria-controls
                                const listboxId = formatBtn.getAttribute('aria-controls');
                                const listbox = listboxId ? document.getElementById(listboxId) : document.querySelector('.listbox__options:not([hidden])');
                                
                                if (listbox) {
                                    const options = Array.from(listbox.querySelectorAll('[role="option"], .listbox__option'));
                                    const buyItNowOption = options.find(opt => (opt.innerText || "").toLowerCase().includes("buy it now") && opt.offsetParent !== null);
                                    
                                    if (buyItNowOption) {
                                        console.log("[eBay AutoLister] Clicking 'Buy It Now' option inside Exact ListBox. Waiting 2.5 seconds...");
                                        buyItNowOption.click();
                                        await new Promise(r => setTimeout(r, 2500));
                                        return; // success
                                    } else {
                                        document.body.click(); // close it if failed
                                    }
                                }
                            } else if (btnText.includes("buy it now") || btnText.includes("fixedprice")) {
                                console.log("[eBay AutoLister] Format is already Buy It Now!");
                                return; // already correct
                            }
                        }
                    }
                }
                attempts++;
                await new Promise(r => setTimeout(r, 600)); // check every 600ms
            }
            console.warn("[eBay AutoLister] Timed out waiting for Format dropdown. (Failed to find hidden select[name='format']).");
        };

        // Await the format switch BEFORE filling everything else
        await waitForFormatAndSwitch();

        // 1. Basic Info
        setInputValue('input[name="title"], input[id*="title"]', productData.title);

        // 2. Price (Selling Price)
        const waitForPriceInputs = async () => {
            const priceVal = String(productData.selling_price || productData.price || "0").replace(/[^\d.]/g, '');
            const priceSelectors = [
                'input[name*="price" i]:not([name="startPrice"])', // avoid auction start price if possible
                'input[aria-label*="buy it now" i]', 
                'input[aria-label*="price" i]', 
                'input[placeholder*="price" i]',
                '.price-input input',
                '.bid-input input'
            ];
            
            let attempts = 0;
            while (attempts < 15) { // wait up to 4.5 seconds
                const priceInputs = Array.from(document.querySelectorAll(priceSelectors.join(',')))
                    .filter(inp => inp.offsetParent !== null && !inp.disabled);
                    
                if (priceInputs.length > 0) {
                    console.log("[eBay AutoLister] Price inputs found. Filling Price:", priceVal);
                    for (const inp of priceInputs) {
                        try { await setInputValue(inp, priceVal); } catch(e) {}
                    }
                    return; // done
                }
                attempts++;
                await new Promise(r => setTimeout(r, 300));
            }
            console.warn("[eBay AutoLister] Timed out waiting for Price inputs to mount.");
        };

        await waitForPriceInputs();

        // 3. Description
        const fillDesc = () => {
            document.querySelectorAll('iframe').forEach(iframe => {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    if (doc && (doc.body.getAttribute('contenteditable') === 'true' || iframe.title.toLowerCase().includes('description') || iframe.id.includes('desc'))) {
                        doc.body.innerHTML = productData.description || productData.about_item || productData.title;
                        doc.body.dispatchEvent(new Event('input', {bubbles: true}));
                    }
                } catch(e) {}
            });
        };
        fillDesc(); setTimeout(fillDesc, 2000);

        // 4. AGGRESSIVE IMAGE UPLOAD & Video Highlight
        if (productData.images && productData.images.length > 0) {
            console.log("[eBay AutoLister] Attempting aggressive image upload...");
            const mediaSelectors = [
                '.image-upload input[type="file"]', 
                '.video-upload input[type="file"]',
                '.uploader-drop-zone input[type="file"]', 
                '#file-input', 'input[type="file"][accept*="image"]'
            ];
            
            const dropZones = [
                '.image-upload', '.uploader-drop-zone', '[class*="media"]', '[id*="media"]', 'button[aria-label*="photo" i]'
            ];

            const fileInput = document.querySelector(mediaSelectors.join(','));
            const dropZone = document.querySelector(dropZones.join(','));

            if (dropZone) {
                dropZone.style.border = "8px solid #0053a0";
                dropZone.style.boxShadow = "0 0 30px #0053a0";
                dropZone.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Try to construct a DataTransfer object with fetched files
                const dataTransfer = new DataTransfer();
                let filesFetched = 0;

                productData.images.forEach((url, i) => {
                    chrome.runtime.sendMessage({ action: "fetchImageBlob", url: url }, response => {
                        if (response && response.dataUrl) {
                            fetch(response.dataUrl)
                                .then(res => res.blob())
                                .then(blob => {
                                    const ext = url.split('.').pop().split(/[#?]/)[0] || 'jpg';
                                    const file = new File([blob], `product_image_${i}.${ext}`, { type: blob.type || 'image/jpeg' });
                                    dataTransfer.items.add(file);
                                    filesFetched++;
                                    
                                    if (filesFetched === productData.images.length) {
                                        console.log("[eBay AutoLister] All images fetched. Dispatching DROP event...");
                                        
                                        // 1. Try file input override
                                        if (fileInput) {
                                            try {
                                                fileInput.files = dataTransfer.files;
                                                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                                            } catch(e) { console.error("File input override failed:", e); }
                                        }

                                        // 2. Try simulated React drop event
                                        const dropEvent = new DragEvent('drop', {
                                            bubbles: true,
                                            cancelable: true,
                                            dataTransfer: dataTransfer
                                        });
                                        dropZone.dispatchEvent(dropEvent);
                                    }
                                });
                        }
                    });
                });
            }
        }

        if (productData.video_url) {
            navigator.clipboard.writeText("VIDEO URL: " + productData.video_url).catch(e=>{});
        }

        // 5. UNIVERSAL ITEM SPECIFICS & VARIATIONS
        setTimeout(async () => {
            console.log("[eBay AutoLister] Starting Universal Fill...");
            let specifics = productData.item_specifics || {};
            if (typeof specifics === 'string') { try { specifics = JSON.parse(specifics); } catch(e) { specifics = {}; } }
            if (productData.brand) specifics["Brand"] = productData.brand;

            // Block non-specifics coming from the admin panel (like Shipping, Returns, Delivery)
            const ignoreList = ['shipping', 'returns', 'delivery', 'list price', 'item price', 'estimated total'];
            Object.keys(specifics).forEach(k => {
                if (ignoreList.includes(k.toLowerCase().trim())) {
                    delete specifics[k];
                }
            });

            const filledKeys = new Set();
            
            // --- Helper: Fill existing fields (Sequential async) ---
            const fillExistingFields = async () => {
                const allInputs = document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [role="combobox"], [role="textbox"], .search-box-attributes');
                let foundAny = false;
                
                // Process each input sequentially
                for (const input of allInputs) {
                    let labelText = "";
                    
                    const ebayFieldContainer = input.closest('[data-testid="attribute"], .summary__attributes--field');
                    if (ebayFieldContainer) {
                        const labelEl = ebayFieldContainer.querySelector('.summary__attributes--label');
                        if (labelEl) labelText = labelEl.innerText;
                    }
                    
                    if (!labelText) {
                        const genericContainer = input.closest('.form-field, .combobox, .field, .ux-labels-values__labels-content, [class*="label"], .aspect-name');
                        if (genericContainer) {
                            const labelEl = genericContainer.querySelector('label, [class*="label"], span');
                            labelText = labelEl ? labelEl.innerText : "";
                        }
                    }

                    if (!labelText) {
                        labelText = input.getAttribute('aria-label') || input.name || input.placeholder || "";
                        labelText = labelText.replace(/search-box-attributes|attributes\.|Search or enter your own/gi, '').trim();
                    }

                    let label = (labelText || "").toLowerCase();
                    label = label.split('\n')[0].replace(/[*:]/g, '').trim();

                    if (!label || label.includes("search")) continue;

                    for (const [key, val] of Object.entries(specifics)) {
                        let cleanKey = key.toLowerCase().replace(/[*:]/g, '').trim();
                        if (cleanKey === "size") cleanKey = "size (men's)"; // Specific hardcode just in case for shoe inputs
                        
                        const isExactMatch = label === cleanKey;
                        const isWordMatch = new RegExp(`\\b${key.toLowerCase().replace(/[*:]/g, '').trim()}\\b`, 'i').test(label);
                        
                        if ((isExactMatch || isWordMatch) && !filledKeys.has(key)) {
                            if (!input.disabled && val) {
                                console.log("[eBay AutoLister] Sequential Matching:", key, "with label:", label, "Element:", input.tagName);
                                const success = await setInputValue(input, String(val));
                                if (success !== false) {
                                    filledKeys.add(key);
                                    foundAny = true;
                                }
                            }
                        }
                    }
                }
                return foundAny;
            };
            
            // Run existing fields fill sequence
            const runExistingSequence = async () => {
                let limit = 10;
                let clickedShowMore = false;
                
                while (limit > 0) {
                    // Try to click Show more early on to expose all fields
                    if (!clickedShowMore) {
                        const allButtons = Array.from(document.querySelectorAll('button'));
                        const showMoreBtn = allButtons.find(el => {
                            const txt = (el.innerText || el.textContent || "").toLowerCase().trim();
                            return txt === "show more" || txt.includes("show more");
                        });
                        
                        // We check for existence of btn before trying to click
                        if (showMoreBtn) {
                            try {
                                const isHidden = showMoreBtn.closest('[hidden]') || showMoreBtn.style.display === 'none';
                                const ariaExpanded = showMoreBtn.getAttribute('aria-expanded');
                                if (!isHidden && ariaExpanded !== 'true') {
                                    console.log("[eBay AutoLister] Clicking 'Show more' early to expose lazy loaded fields...");
                                    showMoreBtn.click();
                                    await new Promise(r => setTimeout(r, 1000));
                                }
                            } catch(e) {}
                            clickedShowMore = true; // Mark as done to prevent spam clicking
                        } else if (limit < 8) {
                            // If we couldn't find it after 3 loops, give up checking it
                            clickedShowMore = true;
                        }
                    }

                    await fillExistingFields();
                    limit--;
                    await new Promise(r => setTimeout(r, 1000));
                }
            };
            runExistingSequence();

            /*
            if (productData.variations && productData.variations.length > 0) {
                const varBtn = Array.from(document.querySelectorAll('button, a, span')).find(el => 
                    /Create variations|Edit variations|Variations/i.test(el.innerText) && el.offsetParent !== null
                );
                if (varBtn) {
                    const clickable = varBtn.closest('button') || varBtn.closest('a') || varBtn;
                    clickable.style.border = "5px solid #e53238";
                    clickable.style.boxShadow = "0 0 20px #e53238";
                    console.log("[eBay AutoLister] Highlighted Variations button.");
                }
            }
            */

            // --- PART B: Variations Automation ---
            const handleVariationsWizard = async () => {
                console.log("[eBay AutoLister] Starting Variations Wizard automation...");
                
                // 1. Find and click "Edit" variations button (Refined for extreme precision)
                const editBtn = document.querySelector('.summary__variations button.summary__header-edit-button') || 
                               document.querySelector('button[aria-label="Edit Variations"]') ||
                               document.querySelector('.summary__variations button') ||
                               Array.from(document.querySelectorAll('button, .faux-link, a, [class*="edit"]')).find(el => {
                                   const txt = (el.innerText || el.textContent || "").toLowerCase().trim();
                                   const isVarContainer = el.closest('.summary__variations, .variations-section, [id*="variation"]');
                                   return txt === "edit" && isVarContainer;
                               });

                if (!editBtn) {
                    console.log("[eBay AutoLister] No Variations 'Edit' button found. Maybe no variations allowed for this category?");
                    return;
                }

                console.log("[eBay AutoLister] Clicking Variations Edit button.");
                editBtn.click();

                // 2. Wait for Wizard container (msku-variation-selection-wrapper)
                let wizardFound = false;
                for (let i = 0; i < 20; i++) {
                    if (document.getElementById('msku-variation-selection-wrapper')) {
                        wizardFound = true;
                        break;
                    }
                    await new Promise(r => setTimeout(r, 500));
                }

                if (!wizardFound) {
                    console.error("[eBay AutoLister] Variations Wizard container not found after clicking Edit.");
                    return;
                }

                // 3. Process Variations from productData
                let variations = productData.variations || [];
                if (typeof variations === 'string') { try { variations = JSON.parse(variations); } catch(e) { variations = []; } }

                const attributesMap = {}; // { 'Color': Set(['Red', 'Blue']), 'Size': Set(['S', 'M']) }
                variations.forEach(v => {
                    const attr = v.attribute || v.name || "";
                    const val = v.value || "";
                    if (attr && val) {
                        if (!attributesMap[attr]) attributesMap[attr] = new Set();
                        attributesMap[attr].add(val);
                    }
                });

                // Helper for fuzzy label matching (e.g., "SIZE (MENS)" -> "Size Type")
                const findFuzzyMatch = (elements, targetText, isAttribute = false) => {
                    const normalizedTarget = targetText.toLowerCase().trim();
                    const list = Array.from(elements);
                    
                    // 1. Exact/Subset match
                    let match = list.find(el => {
                        const txt = (el.innerText || el.textContent || "").toLowerCase().trim();
                        return txt === normalizedTarget || txt.includes(normalizedTarget) || normalizedTarget.includes(txt);
                    });
                    if (match) return match;

                    // 2. Specific eBay mappings
                    if (isAttribute) {
                        if (normalizedTarget.includes("size")) {
                            return list.find(el => {
                                const txt = (el.innerText || el.textContent || "").toLowerCase().trim();
                                return txt.includes("size");
                            });
                        }
                        if (normalizedTarget.includes("color") || normalizedTarget.includes("colour")) {
                            return list.find(el => {
                                const txt = (el.innerText || el.textContent || "").toLowerCase().trim();
                                return txt.includes("color");
                            });
                        }
                    }
                    return null;
                };

                for (const [attrName, values] of Object.entries(attributesMap)) {
                    console.log(`[eBay AutoLister] Processing Variation Aspect: ${attrName}`);

                    // A. Find or Add Attribute Tag
                    const allTags = document.querySelectorAll('.var-tag span');
                    let attrTag = findFuzzyMatch(allTags, attrName, true);

                    if (!attrTag) {
                        console.log(`[eBay AutoLister] Attribute '${attrName}' not found. Adding it...`);
                        const addBtn = document.getElementById('msku-attribute-add');
                        if (addBtn) {
                            addBtn.click();
                            await new Promise(r => setTimeout(r, 1000));

                            // Find in overlay
                            const allLabels = document.querySelectorAll('#msku-variation-checkbox-list label');
                            const checkboxLabel = findFuzzyMatch(allLabels, attrName, true);

                            if (checkboxLabel) {
                                const cb = checkboxLabel.querySelector('input[type="checkbox"]');
                                if (cb && !cb.checked) cb.click();
                            } else {
                                // Add your own attribute
                                const ownAttrCb = document.getElementById('msku-own-parent-tag-checkbox');
                                if (ownAttrCb) {
                                    if (!ownAttrCb.checked) ownAttrCb.click();
                                    await new Promise(r => setTimeout(r, 400));
                                    const ownInput = document.getElementById('msku-custom-parent-attribute-input');
                                    if (ownInput) await setInputValue(ownInput, attrName);
                                }
                            }

                            const saveTagBtn = document.getElementById('msku-add-parent-tag-btn');
                            if (saveTagBtn) {
                                saveTagBtn.click();
                                await new Promise(r => setTimeout(r, 1500));
                            }
                        }
                        
                        // Re-verify
                        attrTag = findFuzzyMatch(document.querySelectorAll('.var-tag span'), attrName, true);
                    }

                    if (attrTag) {
                        // B. Select Attribute Tag to show its options
                        attrTag.click();
                        await new Promise(r => setTimeout(r, 800));

                        const panelId = attrTag.getAttribute('aria-controls');
                        const panel = document.getElementById(panelId);
                        if (panel) {
                            for (const valName of values) {
                                const allOptions = panel.querySelectorAll('li');
                                let optionLi = findFuzzyMatch(allOptions, valName);

                                if (optionLi) {
                                    if (optionLi.getAttribute('aria-pressed') !== 'true') {
                                        optionLi.click();
                                        await new Promise(r => setTimeout(r, 400));
                                    }
                                } else {
                                    // Create your own option for this attribute
                                    console.log(`[eBay AutoLister] Creating own option for ${attrName}: ${valName}`);
                                    const createOwnLink = document.getElementById('msku-custom-option-link');
                                    if (createOwnLink) {
                                        createOwnLink.click();
                                        await new Promise(r => setTimeout(r, 500));
                                        const customInp = document.getElementById('msku-custom-option-input');
                                        if (customInp) {
                                            await setInputValue(customInp, valName);
                                            const addOptBtn = document.getElementById('msku-custom-option-add');
                                            if (addOptBtn) addOptBtn.click();
                                            await new Promise(r => setTimeout(r, 800));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 4. Click Continue to save wizard progress
                const finishBtn = Array.from(document.querySelectorAll('button')).find(b => 
                    (b.innerText || "").toLowerCase().includes("continue")
                );
                if (finishBtn) {
                    console.log("[eBay AutoLister] Finishing Variations Wizard...");
                    finishBtn.click();
                }
            };

            // --- PART B: Variations Automation (Call moved to end of PART C) ---

            // --- PART C: True DOM Custom Specifics Loop (No API Calls) ---
            // Wait for existing fields to finish filling (Wait 12s) before checking what's left
            setTimeout(async () => {
                const remainingKeys = Object.keys(specifics).filter(k => {
                    const val = specifics[k];
                    return !filledKeys.has(k) && val && String(val).trim() !== "" && k.toLowerCase() !== "brand";
                });
                
                if (remainingKeys.length > 0) {
                    console.log("[eBay AutoLister] Unfilled specifics found. QUEUING forcefully:", remainingKeys);
                    console.log("[eBay AutoLister] Starting Custom Specifics DOM Sequence...");
                    // (Removed 'Show more' logic from here - it was moved earlier to run before 'fillExistingFields')                    // 2. Process each missing key sequentially
                    for (const key of remainingKeys) {
                        console.log(`[eBay AutoLister] Processing custom key: ${key}`);
                        
                        // Find "Add specific" button
                        const addBtn = Array.from(document.querySelectorAll('button, .summary__attributes--custom-specific')).find(el => {
                            const txt = (el.innerText || el.textContent || "").toLowerCase().trim();
                            // Look for the "Add custom item specific" text
                            return txt.includes("add custom") || txt.includes("add specific") || txt.includes("add an aspect");
                        });
                        
                        if (!addBtn) {
                            console.error("[eBay AutoLister] Could not find 'Add specific' button. Skipping key.");
                            continue;
                        }
                        
                        const clickable = addBtn.closest('button') || addBtn.closest('a') || addBtn;
                        const initialInputCount = document.querySelectorAll('input:not([type="hidden"])').length;
                        
                        try { clickable.click(); } catch (e) { console.error(e); continue; }
                        
                        // Wait for Modal to open
                        let waited = 0;
                        let modalPopup = null;
                        let nameInput = null;
                        let valInput = null;
                        let saveBtn = null;
                        let closeBtn = null;
                        
                        while (waited < 5000) {
                            await new Promise(r => setTimeout(r, 400));
                            waited += 400;
                            
                            // Explicitly look for the modal dialog overlay
                            modalPopup = document.querySelector('[role="dialog"], .lightbox-dialog, .lightbox');
                            if (modalPopup) {
                                // Find all inputs inside the modal
                                const inputs = Array.from(modalPopup.querySelectorAll('input:not([type="hidden"])')).filter(inp => 
                                    inp.offsetParent !== null && !inp.hidden && !inp.disabled
                                );
                                
                                if (inputs.length >= 2) {
                                    nameInput = inputs[0];
                                    valInput = inputs[1];
                                    
                                    // Find 'Save' and 'Close' buttons
                                    const modalBtns = Array.from(modalPopup.querySelectorAll('button'));
                                    saveBtn = modalBtns.find(b => (b.innerText || "").toLowerCase().includes("save"));
                                    closeBtn = modalBtns.find(b => (b.innerText || "").toLowerCase().includes("close") || b.getAttribute("aria-label")?.toLowerCase().includes("close"));
                                    
                                    break;
                                }
                            }
                        }
                        
                        if (nameInput && valInput && saveBtn && modalPopup) {
                            // 1. Fill Name
                            const didName = await setInputValue(nameInput, key);
                            await new Promise(r => setTimeout(r, 600)); // wait for React to register 
                            
                            // Check for "already exists" error
                            const errorText = Array.from(modalPopup.querySelectorAll('.inline-notice__content, [class*="error"], span, div')).find(el => 
                                (el.innerText || "").toLowerCase().includes("already exists")
                            );
                            
                            if (errorText) {
                                console.warn(`[eBay AutoLister] eBay says '${key}' already exists. Closing modal and skipping.`);
                                if (closeBtn) { try { closeBtn.click(); } catch(e) {} }
                                await new Promise(r => setTimeout(r, 1000));
                                continue; // Skip to next key
                            }
                            
                            // 2. Fill Value
                            const didVal = await setInputValue(valInput, String(specifics[key]));
                            await new Promise(r => setTimeout(r, 600));
                            
                            // 3. Click Save
                            try { saveBtn.click(); } catch(e) {}
                            
                            filledKeys.add(key);
                            console.log(`[eBay AutoLister] Successfully saved custom specific: ${key}`);
                            
                            // Wait for modal to disappear before next iteration
                            await new Promise(r => setTimeout(r, 1500));
                        } else {
                            console.error(`[eBay AutoLister] Failed to find Modal inputs or Save button for key: ${key}`);
                            // Escap hatch: try to close the stuck modal
                            if (closeBtn) { try { closeBtn.click(); } catch(e) {} }
                        }
                    }
                    console.log("[eBay AutoLister] Custom Specifics Sequence Completed.");
                }

                // --- FINAL STEP: Variations Wizard ---
                if (productData.variations && productData.variations.length > 0) {
                    console.log("[eBay AutoLister] All specifics done. Triggering Variations Wizard as the final step...");
                    await handleVariationsWizard();
                }
            }, 12000);
            
        }, 3500);
    });
    } catch (e) { console.error(e); }
}

function createManualButton() {
    if (document.getElementById('ebay-autofill-btn')) return;
    const isListingPage = window.location.href.includes("/sl/list/") || 
                          window.location.href.includes("/lstng") || 
                          window.location.href.includes("/sl/drafts/") ||
                          document.body.innerText.includes("List your item");
                          
    if (!isListingPage) return;

    const btn = document.createElement('button');
    btn.id = 'ebay-autofill-btn';
    btn.innerText = '⚡ Auto-Fill Data';
    btn.style.cssText = 'position:fixed; bottom:30px; right:30px; z-index:999999; padding:15px 30px; background:#0053a0; color:white; border:none; border-radius:12px; font-weight:bold; cursor:pointer; box-shadow:0 10px 30px rgba(0,0,0,0.5); font-size:20px;';
    btn.onclick = performFullFill;
    document.body.appendChild(btn);
}

setInterval(() => { 
    if (!chrome.runtime?.id) return;
    closeUnwantedPopups(); 
    createManualButton(); 
    
    try {
        chrome.storage.local.get("ebayDraftData", (result) => {
            if (result?.ebayDraftData) { 
                handleSuggestPage(result.ebayDraftData); 
                handleIdentifyPage(result.ebayDraftData); 
                handleConditionPage(result.ebayDraftData); 
            }
        });
    } catch (e) {}
}, 3000);
