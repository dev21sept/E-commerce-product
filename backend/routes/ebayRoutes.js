const express = require('express');
const router = express.Router();
const ebayController = require('../controllers/ebayController');

router.get('/auth-url', ebayController.getAuthUrl);
router.get('/callback', ebayController.handleCallback);
router.get('/deletion', ebayController.handleDeletionNotification);
router.post('/deletion', ebayController.handleDeletionNotification);
router.get('/sync', ebayController.triggerSync);
router.get('/policies', ebayController.getUserPolicies);
router.get('/locations', ebayController.getInventoryLocations);
router.get('/conditions', ebayController.getCategoryConditions);
router.get('/connection-status', ebayController.getConnectionStatus);
router.post('/disconnect', ebayController.disconnectEbay);

module.exports = router;


