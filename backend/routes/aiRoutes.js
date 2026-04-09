const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/analyze-product', aiController.analyzeProductImage);
router.post('/save-listing', aiController.saveAiListing);
router.get('/search-categories', aiController.searchCategories);

module.exports = router;
