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
        let parsedUrl;
        try {
            parsedUrl = new URL(request.url);
        } catch (error) {
            sendResponse({ error: "Invalid image URL" });
            return true;
        }

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            sendResponse({ error: "Unsupported URL protocol" });
            return true;
        }

        fetch(parsedUrl.toString())
            .then(res => {
                if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
                const contentType = res.headers.get("content-type") || "";
                if (!contentType.startsWith("image/")) throw new Error("URL does not return an image");
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

// --- NEW FEATURE: SRT TOKEN SNIFFER ---
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        const srtHeader = details.requestHeaders.find(h => h.name.toLowerCase() === 'srt');
        if (srtHeader && srtHeader.value) {
            chrome.storage.local.set({ ebay_srt_token: srtHeader.value });
            console.log("[eBay AutoLister] 🔑 Sniffed SRT Token:", srtHeader.value.substring(0, 10) + "...");
        }
    },
    { urls: ["*://*.ebay.com/*", "*://*.ebay.co.uk/*", "*://*.ebay.de/*"] },
    ["requestHeaders"]
);
