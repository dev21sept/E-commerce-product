chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openEbaySuggest") {
        chrome.tabs.create({ url: "https://www.ebay.com/sl/prelist/suggest" }, () => {
            sendResponse({ status: "success" });
        });
        return true; // Keep message channel open for async response
    }
    
    if (request.action === "fetchImageBlob") {
        fetch(request.url)
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => sendResponse({ dataUrl: reader.result });
                reader.readAsDataURL(blob);
            })
            .catch(err => sendResponse({ error: err.toString() }));
        return true; 
    }
});
