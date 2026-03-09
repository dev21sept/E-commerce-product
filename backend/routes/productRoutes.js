const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.post('/fetch-ebay-product', productController.fetchEbayData);
router.post('/products', productController.createProduct);
router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

module.exports = router;
