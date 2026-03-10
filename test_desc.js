const { fetchDescriptionOnly } = require('./backend/services/descriptionService');

async function test() {
    const url = "https://www.ebay.com/itm/395609968825"; // The Only One Perfume
    console.log("Testing URL:", url);
    const desc = await fetchDescriptionOnly(url);
    console.log("--- RESULT ---");
    console.log(desc.substring(0, 500));
    console.log("--- END RESULT ---");
    console.log("Length:", desc.length);
    if (desc.toLowerCase().includes("home") && desc.toLowerCase().includes("perfume for her")) {
        console.log("FAIL: Menu still exists!");
    } else {
        console.log("PASS: No store menu detected.");
    }
}


test();
