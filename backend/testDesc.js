const { fetchEbayProduct } = require('./services/ebayScraper');

async function test() {
    console.log("Starting full scrape...");
    const url = 'https://www.ebay.com/itm/354838957999';
    try {
        const data = await fetchEbayProduct(url);
        console.log("SUCCESS");
        console.log("Description length:", data.description?.length);
        console.log("Description start:", data.description?.substring(0, 150));
    } catch (e) {
        console.error(e);
    }
}
test();
