chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("[eBay AutoLister] Background received action:", request.action);

    if (request.action === "openEbaySuggest") {
        chrome.tabs.create({ url: "https://www.ebay.com/sl/prelist/suggest" }, (tab) => {
            if (chrome.runtime.lastError) {
                console.error("[eBay AutoLister] Tab creation failed:", chrome.runtime.lastError.message);
                sendResponse({ status: "error", message: chrome.runtime.lastError.message });
            } else {
                console.log("[eBay AutoLister] eBay tab opened successfully:", tab.id);
                sendResponse({ status: "success" });
            }
        });
        return true; // Keep message channel open for async response
    }
    
    if (request.action === "fetchImageBlob") {
        fetch(request.url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
                return res.blob();
            })
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => sendResponse({ dataUrl: reader.result });
                reader.readAsDataURL(blob);
            })
            .catch(err => {
                console.error("[eBay AutoLister] Image fetch failed:", err.message);
                sendResponse({ error: err.toString() });
            });
        return true; 
    }
});
