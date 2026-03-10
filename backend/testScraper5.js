const { fetchEbayProduct } = require('./services/ebayScraper');
const fs = require('fs');

async function test() {
    try {
        const url = 'https://www.ebay.com/itm/354838957999';
        const data = await fetchEbayProduct(url);
        fs.writeFileSync('test_desc.html', data.description || 'No description');
        console.log('Saved desc to test_desc.html');
        fs.writeFileSync('test_vars.json', JSON.stringify(data.variations, null, 2));
    } catch (e) {
        console.error('ERROR:', e);
    }
}

test();
