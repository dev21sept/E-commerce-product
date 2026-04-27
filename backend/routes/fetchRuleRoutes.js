const express = require('express');
const router = express.Router();
const fetchRuleController = require('../controllers/fetchRuleController');

router.get('/', fetchRuleController.getRules);
router.get('/condition-notes', fetchRuleController.getConditionNotes);
router.post('/', fetchRuleController.createRule);
router.put('/:id', fetchRuleController.updateRule);
router.delete('/:id', fetchRuleController.deleteRule);

module.exports = router;
