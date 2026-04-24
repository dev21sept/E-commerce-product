const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');

// Direct Listing via eBay API
router.post('/ebay/:productId', listingController.listOnEbay);
router.get('/public-image/:productId/:index', listingController.serveProductImage);

module.exports = router;
