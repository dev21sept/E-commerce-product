const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

const aiController = require('../controllers/aiController');

router.post('/fetch-ebay-product', productController.fetchEbayData);
router.post('/scrape-ebay', productController.scrapeEbayDescription);
router.post('/products', productController.createProduct);

// AI Fetching Routes
router.post('/ai/analyze-product', aiController.analyzeProductImage);
router.post('/ai/save-listing', aiController.saveAiListing);
router.get('/ai/search-categories', aiController.searchCategories);

router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

module.exports = router;
