// Debugging: Let us know the content script initialized
console.log("%c [eBay AutoLister] 🚀 Admin Script Loaded", "color: #4F46E5; font-weight: bold; font-size: 14px;");

window.addEventListener("message", (event) => {
    // Only accept messages from our own window
    if (event.source === window && event.data && event.data.type === "EbayAutoLister_SendData") {
        console.log("[eBay AutoLister] 🎯 Message RECEIVED from Frontend:", event.data.type);
        const productData = event.data.payload;
        
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
    }
});
