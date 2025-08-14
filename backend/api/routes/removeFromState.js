const express = require('express');
const router = express.Router();

// DELETE /api/state/:id - Remove item from state
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Here you would implement the logic to remove the item from state
        // This could involve:
        // 1. Finding the item in the state collection
        // 2. Removing it from the database
        // 3. Optionally logging the removal in history
        
        console.log(`Removing item with ID: ${id} from state`);
        
        // Placeholder response - you'll need to implement actual database logic
        res.status(200).json({
            message: 'Item successfully removed from state',
            removedId: id,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error removing item from state:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to remove item from state'
        });
    }
});

module.exports = router;
