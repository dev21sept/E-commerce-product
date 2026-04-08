console.log("%c [Poshmark AutoLister] 🚀 Admin Script Loaded", "color: #8D182E; font-weight: bold; font-size: 14px;");

window.addEventListener("message", (event) => {
    // Only trust messages from our site
    if (event.source !== window || !event.data) return;

    if (event.data.type === "PoshmarkAutoLister_SendData") {
        const product = event.data.payload;
        console.log("[Poshmark AutoLister] 🛠️ Received Data for Poshmark:", product);

        // Store data and request tab
        chrome.storage.local.set({ "poshmarkDraftData": product }, () => {
            console.log("[Poshmark AutoLister] ✅ Draft saved. Opening Poshmark...");
            chrome.runtime.sendMessage({ action: "openPoshmarkCreate" });
        });
    }
});
