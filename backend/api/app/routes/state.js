const express = require('express');
const router = express.Router();
const StateController = require('../controllers/state');

// Add a new state
router.post('/add', StateController.addState); // Ensure this matches the frontend request URL

module.exports = router;
