console.log("[Vinted AutoLister] Content script active!");

// --- UTILITY: Simulation (Human-like Typing & Selecting) ---
async function setInputValue(selectorOrEl, value) {
    const selectorArr = Array.isArray(selectorOrEl) ? selectorOrEl : [selectorOrEl];
    let el = null;
    for (const sel of selectorArr) {
        el = document.querySelector(sel);
        if (el && !el.disabled) break;
    }
    if (!el) {
        const allPossible = Array.from(document.querySelectorAll('input, textarea'));
        el = allPossible.find(i => {
            const p = i.placeholder?.toLowerCase() || i.getAttribute('aria-placeholder')?.toLowerCase() || "";
            return ["brand", "selling", "title", "about it", "fit", "description"].some(k => p.includes(k));
        });
    }
    if (!el) return false;

    try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        let target = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? el : el.querySelector('input, textarea');
        if (target) {
            target.focus();
            const proto = target.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
            const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
            if (nativeSetter) { nativeSetter.call(target, value); } else { target.value = value; }
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
            target.dispatchEvent(new Event('blur', { bubbles: true }));
            await new Promise(r => setTimeout(r, 400));
            return true;
        }
        return false;
    } catch(e) { return false; }
}

function stripHTML(html) {
    if (!html) return "";
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html.replace(/<br\s*[\/]?>/gi, "\n");
    return tmp.textContent || tmp.innerText || "";
}

// --- UI: Floating Toolbar ---
async function showStatus(text, type = 'info') {
    let statusEl = document.getElementById('vint-lister-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'vint-lister-status';
        statusEl.style = "position:fixed; top:15px; right:15px; z-index:2147483647; background:rgba(255,255,255,0.95); backdrop-filter:blur(10px); border-radius:20px; box-shadow:0 15px 35px rgba(0,0,0,0.15); padding:18px; width:280px; font-family:'Inter', sans-serif; border: 1px solid rgba(9, 177, 186, 0.2); transition: all 0.3s ease;";
        document.body.appendChild(statusEl);
    }

    const data = await new Promise(r => chrome.storage.local.get("vintedDraftData", d => r(d.vintedDraftData)));
    const targetCat = data?.category || "Not Defined";
    
    const colors = { info: "#09B1BA", success: "#10B981", error: "#EF4444" };
    statusEl.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;"><div style="width:10px; height:10px; border-radius:50%; background:${colors[type]};"></div><span style="font-weight:800; font-size:13px; color:#1F2937;">Vinted Pro</span></div>
        </div>
        
        <div style="background:rgba(9, 177, 186, 0.1); border-radius:10px; padding:10px; margin-bottom:12px; border:1px solid rgba(9, 177, 186, 0.2);">
            <p style="font-size:10px; font-weight:bold; color:#1F2937; margin:0 0 4px 0; text-transform:uppercase;">📌 Preferred Category:</p>
            <p style="font-size:11px; color:#09B1BA; font-weight:700; margin:0; word-break:break-word;">${targetCat}</p>
        </div>

        <p style="font-size:11px; font-weight:500; color:#4B5563; margin:0 0 15px 0; line-height:1.4;">${text}</p>
        
        <div style="display:grid; grid-template-columns:1fr; gap:8px;">
            <button id="vint-fill-basics" style="background:#09B1BA; color:white; border:none; padding:10px; border-radius:12px; font-size:11px; font-weight:800; cursor:pointer; box-shadow:0 4px 6px -1px rgba(9, 177, 186, 0.3);">🚀 1. Fill Basics</button>
            <button id="vint-fill-specs" style="background:#4F46E5; color:white; border:none; padding:10px; border-radius:12px; font-size:11px; font-weight:800; cursor:pointer;">✨ 2. Fill Specs (Brand/Condition)</button>
            <button id="vint-fill-imgs" style="background:#F3F4F6; color:#374151; border:none; padding:10px; border-radius:12px; font-size:11px; font-weight:700; cursor:pointer;">📸 3. Upload Images</button>
        </div>
    `;
    document.getElementById('vint-fill-basics')?.addEventListener('click', fillVintedBasics);
    document.getElementById('vint-fill-specs')?.addEventListener('click', fillVintedSpecs);
    document.getElementById('vint-fill-imgs')?.addEventListener('click', fillVintedImages);
}

async function fillVintedBasics() {
    const data = await new Promise(r => chrome.storage.local.get("vintedDraftData", d => r(d.vintedDraftData)));
    if (!data) return showStatus("❌ No data found!", "error");
    
    showStatus("⚡ Filling Title/Price/Description...", "info");
    await setInputValue(['input#title', 'input[name="title"]'], data.title);
    await setInputValue(['textarea#description', 'textarea[name="description"]'], stripHTML(data.description || data.about_item));
    const price = String(data.selling_price || "").replace(/[^\d.]/g, '');
    if (price) await setInputValue(['input#price', 'input[name="price"]'], price);

    const specificCat = document.querySelector('[data-testid="catalog-select-dropdown-input"]') || document.querySelector('input#category');
    if (specificCat) {
        specificCat.scrollIntoView({ behavior: 'smooth', block: 'center' });
        specificCat.focus();
        specificCat.click();
        showStatus("👉 Category Menu Open. Select then click 'Fill Specs'.", "success");
    }
}

async function fillVintedSpecs() {
    const data = await new Promise(r => chrome.storage.local.get("vintedDraftData", d => r(d.vintedDraftData)));
    if (!data) return showStatus("❌ No data found!", "error");

    showStatus("⚡ Filling Internal Specs...", "info");
    
    // 1. Brand Detection (Vinted has search dropdown for brand)
    const brandInput = document.querySelector('input[placeholder*="Brand"i], input[name*="brand"i]');
    if (brandInput && data.brand) {
        await setInputValue(brandInput, data.brand);
    }

    // 2. Condition Selection (Click based on AI mapping)
    const condition = data.item_specifics?.Condition || data.condition || "";
    if (condition) {
        const conditionLabels = Array.from(document.querySelectorAll('label, span, p')).filter(el => el.innerText?.toLowerCase().includes("condition"));
        const targetLabel = conditionLabels.find(l => l.innerText?.toLowerCase().includes(condition.toLowerCase()) || l.parentElement?.innerText?.toLowerCase().includes(condition.toLowerCase()));
        if (targetLabel) targetLabel.click();
    }

    // 3. Color Selection
    const color = data.item_specifics?.Color || "";
    if (color) {
        const colorTitle = Array.from(document.querySelectorAll('div, label')).find(el => el.innerText?.toLowerCase() === "color");
        if (colorTitle) {
            const nextEl = colorTitle.nextElementSibling || colorTitle.parentElement.nextElementSibling;
            if (nextEl) nextEl.click(); // Open color list
        }
    }

    showStatus("✅ Basic Specs filled! Verify and save.", "success");
}

async function fillVintedImages() {
    const data = await new Promise(r => chrome.storage.local.get("vintedDraftData", d => r(d.vintedDraftData)));
    if (!data || !data.images) return showStatus("❌ No images found!", "error");
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
        const dataTransfer = new DataTransfer();
        for (let i = 0; i < data.images.slice(0, 12).length; i++) {
            const res = await new Promise(r => chrome.runtime.sendMessage({ action: "fetchImageBlob", url: data.images[i] }, r));
            if (res?.dataUrl) {
                const r = await fetch(res.dataUrl);
                const blob = await r.blob();
                dataTransfer.items.add(new File([blob], `item_${i}.jpg`, {type:'image/jpeg'}));
            }
        }
        fileInput.files = dataTransfer.files; fileInput.dispatchEvent(new Event('change', {bubbles:true}));
        showStatus("✅ Images uploaded!", "success");
    }
}

setTimeout(() => showStatus("Vinted ready to fill."), 2000);
