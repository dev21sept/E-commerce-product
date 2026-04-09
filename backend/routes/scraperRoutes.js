const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');

router.post('/fetch-ebay-product', scraperController.fetchEbayData);
router.post('/scrape-ebay', scraperController.scrapeEbayDescription);
router.get('/aspects/:categoryId', scraperController.getCategoryAspects);

module.exports = router;
