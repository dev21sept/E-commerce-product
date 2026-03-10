const fs = require('fs');
const cheerio = require('./node_modules/cheerio');

const html = fs.readFileSync('dev_msku.html', 'utf8');
const $ = cheerio.load(html);

console.log('x-msku exist?', $('.x-msku').length);
console.log('x-msku-select-box-wrapper exist?', $('.x-msku__select-box-wrapper').length);

const variationsMap = {};
$('.x-msku__select-box-wrapper, .msku-sel-cont').each((i, wrapper) => {
    let name = $(wrapper).find('.x-msku__label-text, label').text().replace(':', '').replace('*', '').trim();
    if (name && name.toLowerCase() !== 'quantity') {
        let options = [];
        const select = $(wrapper).find('select');
        if (select.length > 0) {
            select.find('option').each((j, opt) => {
                let v = $(opt).text().split('\n')[0].trim();
                if (v && v.toLowerCase() !== '- select -' && v.toLowerCase() !== 'select' && !v.includes('Out of stock')) {
                    options.push(v);
                }
            });
        }

        const customOptions = $(wrapper).find('[role="option"], .listbox__option, .x-msku__listbox-option, .listbox-option');
        if (customOptions.length > 0) {
            customOptions.each((j, opt) => {
                let text = $(opt).text().trim().split('\n')[0].trim();
                if (text && text.toLowerCase() !== '- select -' && text.toLowerCase() !== 'select' && !text.includes('Out of stock')) {
                    options.push(text);
                }
            });
        }
        variationsMap[name] = options;
    }
});

console.log("Cheerio Variations:", JSON.stringify(variationsMap, null, 2));

// check if there's any other json
let jsonRaw = null;
$('script').each((i, el) => {
    const text = $(el).html();
    if (text && text.includes('menuItemMap')) {
        jsonRaw = 'found menuItemMap!';
    }
});
console.log('JSON approach:', jsonRaw);
