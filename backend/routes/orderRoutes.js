const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Get all orders
router.get('/', orderController.getOrders);

// Update tracking for a specific order
router.post('/:orderId/tracking', orderController.updateTracking);

module.exports = router;
