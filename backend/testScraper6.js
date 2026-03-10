const { fetchEbayProduct } = require('./services/ebayScraper');
const fs = require('fs');

async function test() {
    try {
        const url = 'https://www.ebay.com/itm/354838957999';
        console.log('Fetching:', url);
        const data = await fetchEbayProduct(url);
        fs.writeFileSync('test_desc6.txt', data.description || 'No description');
        console.log('Saved desc to test_desc6.txt');
        console.log('Description start:', data.description ? data.description.substring(0, 100) : 'none');
    } catch (e) {
        console.error('ERROR:', e);
    }
}

test();
