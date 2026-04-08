console.log("[Poshmark AutoLister] Content script active!");

// --- UTILITY: Simulation (Human-like Typing & Selecting) ---
async function setInputValue(selectorOrEl, value) {
    const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!el || el.disabled) return false;

    try {
        console.log(`[Poshmark AutoLister] Setting "${value}" for:`, el);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        let input = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? el : el.querySelector('input, textarea');
        if (input) {
            input.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set || 
                               Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
            if (nativeSetter) { nativeSetter.call(input, value); } else { input.value = value; }
            
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true }));
            await new Promise(r => setTimeout(r, 600));
            return true;
        }
        return false;
    } catch(e) { return false; }
}

// --- UI: Floating Toolbar (eBay Style) ---
function showStatus(text, type = 'info') {
    let statusEl = document.getElementById('posh-lister-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'posh-lister-status';
        statusEl.style = `
            position: fixed; top: 15px; right: 15px; z-index: 2147483647; 
            background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); 
            border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.15); 
            padding: 18px; width: 250px; font-family: 'Inter', sans-serif; 
            border: 1px solid rgba(141, 24, 46, 0.2); transition: all 0.3s ease;
        `;
        document.body.appendChild(statusEl);
    }
    
    const colors = { info: "#8D182E", success: "#10B981", error: "#EF4444" };

    statusEl.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:10px; height:10px; border-radius:50%; background:${colors[type]};"></div>
                <span style="font-weight:800; font-size:13px; color:#1F2937; letter-spacing:-0.4px;">Poshmark Pro</span>
            </div>
            <span style="font-size:10px; font-weight:bold; color:#9CA3AF;">v1.0</span>
        </div>
        <p style="font-size:11px; font-weight:500; color:#4B5563; margin:0 0 15px 0; line-height:1.5; padding:8px; background:rgba(141, 24, 46, 0.05); border-radius:10px;">${text}</p>
        <div style="display:grid; grid-template-columns:1fr; gap:8px;">
            <button id="posh-fill-all" style="background:#8D182E; color:white; border:none; padding:10px; border-radius:12px; font-size:11px; font-weight:800; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 6px -1px rgba(141, 24, 46, 0.2);">🚀 1. Fill Auto Fields</button>
            <button id="posh-fill-imgs" style="background:#F3F4F6; color:#374151; border:1px solid #E5E7EB; padding:10px; border-radius:12px; font-size:11px; font-weight:700; cursor:pointer; transition:all 0.2s;">📸 2. Upload Images</button>
        </div>
    `;

    document.getElementById('posh-fill-all')?.addEventListener('click', fillPoshmarkFields);
    document.getElementById('posh-fill-imgs')?.addEventListener('click', fillPoshmarkImages);
}

async function fillPoshmarkFields() {
    const data = await new Promise(r => chrome.storage.local.get("poshmarkDraftData", d => r(d.poshmarkDraftData)));
    if (!data) return showStatus("❌ No data found!", "error");
    
    showStatus("⚡ Injecting details...", "info");
    
    // Title - Multiple matches
    const titleSelectors = ['input[placeholder*="selling"]', '[data-testid="listing-form-title"]', 'input[name="title"]', 'input[aria-label*="Title" i]'];
    await setInputValue(titleSelectors.join(','), data.title);
    
    // Description
    const descSelectors = ['textarea[placeholder*="Describe"]', '[data-testid="listing-form-description"]', 'textarea[name="description"]', 'textarea[aria-label*="Description" i]'];
    await setInputValue(descSelectors.join(','), data.description || data.about_item);
    
    // Price
    const price = String(data.selling_price || "").replace(/[^\d.]/g, '');
    const priceSelectors = ['input[name="listingPrice"]', '[data-testid="listing-form-price-input"]', 'input[placeholder*="Price"]', 'input[aria-label*="Price" i]'];
    if (price) await setInputValue(priceSelectors.join(','), price);
    
    showStatus("✅ Fields synchronized!", "success");
}

async function fillPoshmarkImages() {
    const data = await new Promise(r => chrome.storage.local.get("poshmarkDraftData", d => r(d.poshmarkDraftData)));
    if (!data || !data.images) return showStatus("❌ No images found!", "error");
    
    showStatus("📸 Porting images...", "info");
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
        const dataTransfer = new DataTransfer();
        for (let i = 0; i < data.images.slice(0, 8).length; i++) {
            const res = await new Promise(r => chrome.runtime.sendMessage({ action: "fetchImageBlob", url: data.images[i] }, r));
            if (res?.dataUrl) {
                const r = await fetch(res.dataUrl);
                const blob = await r.blob();
                dataTransfer.items.add(new File([blob], `img_${i}.jpg`, {type:'image/jpeg'}));
            }
        }
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', {bubbles:true}));
        showStatus("✅ Portfolio uploaded!", "success");
    }
}

// Start with initial status
setTimeout(() => showStatus("Dashboard data synced. Ready to fill."), 2000);
