const express = require('express');
const router = express.Router();
const OperationController = require('../controllers/operation');
const checkAuth = require('../middleware/check-auth'); // 🔒 OPERACJE SYSTEMU

// Helper function to get location name from symbol  
const getLocationFromSymbol = async (symbol, isDestination = false) => {
  try {
    if (symbol === 'MAGAZYN') {
      return 'MAGAZYN';
    }
    
    if (isDestination && symbol === '-') {
      return 'Sprzedane';
    }
    
    // Find user by symbol to get selling point name
    const User = require('../models/user');
    const user = await User.findOne({ symbol: symbol });
    
    if (user && user.sellingPoint) {
      return user.sellingPoint;
    }
    
    // Fallback to symbol if no user found
    return symbol || 'Unknown';
  } catch (error) {
    console.error('Error getting location from symbol:', error);
    return symbol || 'Unknown';
  }
};

// ========== WSZYSTKIE OPERACJE SYSTEMU WYMAGAJĄ AUTORYZACJI ==========
router.get('/check-lock', checkAuth, OperationController.checkSalesLock); // 🔒 Sprawdzenie blokady sprzedaży
router.post('/cancel/:operationId', checkAuth, OperationController.cancelOperation); // 🔒 Anulowanie operacji
router.get('/', checkAuth, OperationController.getOperations); // 🔒 Lista operacji

module.exports = router;