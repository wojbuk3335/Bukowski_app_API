const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orders');
const authenticateToken = require('../middleware/check-auth');

// Create new order
router.post('/', authenticateToken, orderController.createOrder);

// Send order email
router.post('/send-email', authenticateToken, orderController.sendOrderEmail);

// Get all orders
router.get('/', authenticateToken, orderController.getAllOrders);

// Get order by ID
router.get('/:orderId', authenticateToken, orderController.getOrderById);

// Complete order
router.put('/:id/complete', authenticateToken, orderController.completeOrder);

// Revert order back to pending
router.put('/:id/revert', authenticateToken, orderController.revertOrder);

module.exports = router;