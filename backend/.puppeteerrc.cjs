const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Changes the cache location for Puppeteer to a directory that persists on Render.
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
