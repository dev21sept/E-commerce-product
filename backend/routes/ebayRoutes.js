const express = require('express');
const router = express.Router();
const ebayController = require('../controllers/ebayController');

router.get('/auth-url', ebayController.getAuthUrl);
router.get('/callback', ebayController.handleCallback);
router.get('/deletion', ebayController.handleDeletionNotification);

module.exports = router;
