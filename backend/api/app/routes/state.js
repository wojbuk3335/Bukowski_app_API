const express = require('express');
const router = express.Router();
const StateController = require('../controllers/state');

// Add a new state
router.post('/add', StateController.addState); // Ensure this matches the frontend request URL
router.get('/get', StateController.getAllStates); // Ensure this matches the frontend request URL
router.get('/get/:stateId', StateController.getStateById); // Ensure
router.delete('/delete/:stateId', StateController.deleteState); // Ensure this matches the frontend request URL
router.patch('/update/:stateId', StateController.updateState); // Ensure

module.exports = router;
