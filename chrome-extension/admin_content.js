// Debugging: Let us know the content script initialized
console.log("%c [eBay AutoLister] 🚀 Admin Script Loaded", "color: #4F46E5; font-weight: bold; font-size: 14px;");

window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    let originUrl;
    try {
        originUrl = new URL(event.origin);
    } catch (error) {
        return;
    }
    // Allowing all origins for the data transmission (Needed for Railway deployments)
    // if (!["localhost", "127.0.0.1"].includes(originUrl.hostname)) return;
    if (!event.data || event.data.type !== "EbayAutoLister_SendData") return;
    
    console.log("[eBay AutoLister] 🎯 Message RECEIVED from Frontend:", event.data.type);
    const productData = event.data.payload;
    
    if (!productData || typeof productData !== "object") {
        console.error("[eBay AutoLister] ❌ Invalid payload received:", productData);
        return;
    }

    if (!productData.title || productData.title.trim().length === 0) {
        console.warn("[eBay AutoLister] ⚠️ Product title is empty. Some automation steps may fail.");
    }
        
    // Save the data temporarily in Chrome storage
        chrome.storage.local.set({ ebayDraftData: productData }, () => {
            console.log("[eBay AutoLister] ✅ Data SAVED to Storage.");
            
            // Instruct the background script to open a new eBay tab
            chrome.runtime.sendMessage({ action: "openEbaySuggest" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("[eBay AutoLister] ❌ Background Message ERROR:", chrome.runtime.lastError.message);
                } else {
                    console.log("[eBay AutoLister] 🌐 Requesting eBay Tab...", response);
                }
            });
        });
});
