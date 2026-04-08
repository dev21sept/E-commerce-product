chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openVintedCreate") {
        console.log("[Vinted AutoLister] 🌐 Requesting Vinted Tab...");
        chrome.tabs.create({ url: "https://www.vinted.com/items/new" }, (tab) => {
            sendResponse({ success: true, tabId: tab.id });
        });
        return true; 
    }

    if (request.action === "fetchImageBlob") {
        fetch(request.url)
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => sendResponse({ dataUrl: reader.result });
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                console.error("Fetch ERROR:", error);
                sendResponse({ error: error.message });
            });
        return true; 
    }
});

// FEATURE: Open Vinted create page on icon click
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({ url: "https://www.vinted.com/items/new" });
});
