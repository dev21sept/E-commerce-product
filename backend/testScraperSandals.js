const { fetchEbayProduct } = require('./services/ebayScraper');

const url = 'https://www.ebay.com/itm/204365313431'; // A valid eBay item with variations (shoes)

(async () => {
    try {
        console.log('Fetching:', url);
        const data = await fetchEbayProduct(url);
        console.log('Title:', data.title);
        console.log('Variations Found:', data.variations.length);
        data.variations.forEach(v => {
            console.log(`- ${v.name}:`, v.values.join(', '));
        });
        console.log('Item Specifics count:', Object.keys(data.item_specifics).length);
        console.log('Description length:', data.description.length);
    } catch (err) {
        console.error(err);
    }
})();
