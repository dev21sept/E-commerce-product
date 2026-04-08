console.log("%c [Vinted AutoLister] 🚀 Admin Script Loaded", "color: #09B1BA; font-weight: bold; font-size: 14px;");

window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data.type === "VintedAutoLister_SendData") {
        const product = event.data.payload;
        console.log("[Vinted AutoLister] 🛠️ Received Data for Vinted:", product);

        // Store data and request tab
        chrome.storage.local.set({ "vintedDraftData": product }, () => {
            console.log("[Vinted AutoLister] ✅ Draft saved. Opening Vinted...");
            chrome.runtime.sendMessage({ action: "openVintedCreate" });
        });
    }
});
