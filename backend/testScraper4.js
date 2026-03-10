const { fetchEbayProduct } = require('./services/ebayScraper');

async function test() {
    try {
        const url = 'https://www.ebay.com/itm/354838957999';
        console.log(`Testing URL: ${url}`);
        const data = await fetchEbayProduct(url);
        console.log('SUCCESS');
        console.log('Description length:', data.description ? data.description.length : 0);
        require('fs').writeFileSync('testScraper4_out.json', JSON.stringify(data.variations, null, 2));
    } catch (e) {
        console.error('ERROR:', e);
    }
}

test();
