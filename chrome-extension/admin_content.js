// Let us know the content script actually initialized!
console.log("[eBay AutoLister] 🚀 Content Script is successfully loaded and waiting for messages on:", window.location.href);

window.addEventListener("message", (event) => {
    // Only accept messages from our own window
    if (event.source !== window || !event.data || event.data.type !== "EbayAutoLister_SendData") {
        return;
    }
    
    if (event.data.type === "EbayAutoLister_SendData") {
        const productData = event.data.payload;
        console.log("[eBay AutoLister] Received product data from Admin Panel:", productData);
        
        // Save the data temporarily in Chrome storage
        chrome.storage.local.set({ ebayDraftData: productData }, () => {
            console.log("[eBay AutoLister] Data saved into Extension storage.");
            // Instruct the background script to open a new eBay tab
            chrome.runtime.sendMessage({ action: "openEbaySuggest" });
        });
    }
});
