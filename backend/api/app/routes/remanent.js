const express = require('express');
const router = express.Router();
const RemanentController = require('../controllers/remanent');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // Security middleware

// ========== ALL ENDPOINTS REQUIRE AUTHORIZATION ==========

// POST - Save remanent items to database
router.post('/', checkAuth, historyLogger('remanent'), RemanentController.saveRemanentItems);

// GET - Get all remanent records for the authenticated user
router.get('/', checkAuth, RemanentController.getRemanentRecords);

// GET - Get current state for comparison with remanent
router.get('/current-state', checkAuth, RemanentController.getCurrentState);

// GET - Get remanent statistics
router.get('/stats', checkAuth, RemanentController.getRemanentStats);

// DELETE - Delete a specific remanent record
router.delete('/:id', checkAuth, historyLogger('remanent'), RemanentController.deleteRemanentRecord);

// DELETE - Delete a specific item from remanent record
router.delete('/:remanentId/items/:itemId', checkAuth, historyLogger('remanent'), RemanentController.deleteRemanentItem);

module.exports = router;