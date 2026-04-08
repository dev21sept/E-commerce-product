chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openPoshmarkCreate") {
        console.log("[Poshmark AutoLister] 🌐 Requesting Poshmark Tab...");
        chrome.tabs.create({ url: "https://poshmark.com/create-listing" }, (tab) => {
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

// FEATURE: Open Poshmark create page on icon click
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({ url: "https://poshmark.com/create-listing" });
});
