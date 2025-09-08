// Debug endpoint for testing warehouse processing
const express = require('express');
const mongoose = require('mongoose');
const State = require('./app/db/models/state');
const User = require('./app/db/models/user');
const Transfer = require('./app/db/models/transfer');
const History = require('./app/db/models/history');

const router = express.Router();

// Test endpoint to manually create warehouse item and test processing
router.post('/create-test-warehouse-item', async (req, res) => {
    try {
        console.log('🧪 Creating test warehouse item...');
        
        // Find warehouse user
        const warehouseUser = await User.findOne({ symbol: 'MAGAZYN' });
        if (!warehouseUser) {
            return res.status(404).json({ error: 'Warehouse user not found' });
        }
        
        console.log('🧪 Found warehouse user:', warehouseUser._id);
        
        // Create test item in warehouse
        const testItem = new State({
            _id: new mongoose.Types.ObjectId(),
            fullName: new mongoose.Types.ObjectId("68b90d490d85065109013908"),
            date: new Date(),
            size: new mongoose.Types.ObjectId("68b90d3a0d850651090138da"),
            barcode: `TEST_${Date.now()}`,
            sellingPoint: warehouseUser._id,
            price: 1390,
            discount_price: 0
        });

        await testItem.save();
        console.log('🧪 Test item created:', testItem._id);
        
        res.json({
            message: 'Test warehouse item created',
            itemId: testItem._id,
            barcode: testItem.barcode,
            warehouseUserId: warehouseUser._id
        });
        
    } catch (error) {
        console.error('🧪 Error creating test item:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint to process single warehouse item
router.post('/test-process-single-item', async (req, res) => {
    try {
        const { itemId, targetUserId } = req.body;
        
        console.log('🧪 Testing single item processing...');
        console.log('🧪 Item ID:', itemId);
        console.log('🧪 Target User ID:', targetUserId);
        
        // Find the state item
        const stateItem = await State.findById(itemId)
            .populate('fullName')
            .populate('size')
            .populate('sellingPoint');
            
        if (!stateItem) {
            return res.status(404).json({ error: 'State item not found' });
        }
        
        console.log('🧪 Found state item:', stateItem._id);
        console.log('🧪 Current selling point:', stateItem.sellingPoint.symbol);
        
        // Find target user
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ error: 'Target user not found' });
        }
        
        console.log('🧪 Found target user:', targetUser.symbol);
        
        // Test the whole process
        const result = await testWarehouseTransfer(stateItem, targetUser);
        
        res.json(result);
        
    } catch (error) {
        console.error('🧪 Error in test processing:', error);
        res.status(500).json({ error: error.message });
    }
});

async function testWarehouseTransfer(stateItem, targetUser) {
    const results = {
        steps: [],
        success: false
    };
    
    try {
        // Step 1: Create transfer
        results.steps.push('Creating transfer...');
        const transfer = new Transfer({
            _id: new mongoose.Types.ObjectId(),
            fullName: stateItem.fullName?.fullName || 'Unknown',
            size: stateItem.size?.Roz_Opis || 'Unknown',
            barcode: stateItem.barcode,
            transfer_from: 'MAGAZYN',
            transfer_to: targetUser._id.toString(),
            date: new Date(),
            dateString: new Date().toISOString().split('T')[0],
            productId: stateItem.barcode,
            price: stateItem.price || 0,
            discount_price: stateItem.discount_price || 0,
            processed: true
        });
        
        await transfer.save();
        results.steps.push(`Transfer created: ${transfer._id}`);
        
        // Step 2: Delete from warehouse
        results.steps.push('Deleting from warehouse...');
        const deletedItem = await State.findByIdAndDelete(stateItem._id);
        if (!deletedItem) {
            throw new Error('Failed to delete from warehouse');
        }
        results.steps.push('Successfully deleted from warehouse');
        
        // Step 3: Create new state in target location
        results.steps.push('Creating new state in target location...');
        const newState = new State({
            _id: new mongoose.Types.ObjectId(),
            fullName: stateItem.fullName._id,
            size: stateItem.size._id,
            date: new Date(),
            barcode: stateItem.barcode,
            sellingPoint: targetUser._id,
            price: stateItem.price || 0,
            discount_price: stateItem.discount_price || 0
        });
        
        console.log('🧪 About to save new state:', newState.toObject());
        await newState.save();
        console.log('🧪 New state saved successfully');
        results.steps.push(`New state created: ${newState._id} in ${targetUser.symbol}`);
        
        // Step 4: Create history entry
        results.steps.push('Creating history entry...');
        const history = new History({
            _id: new mongoose.Types.ObjectId(),
            collectionName: 'state',
            operation: 'Transfer z magazynu',
            details: `Transfer ${stateItem.fullName?.fullName} ${stateItem.size?.Roz_Opis} z MAGAZYN do ${targetUser.symbol}`,
            from: 'MAGAZYN',
            to: targetUser.symbol,
            transactionId: `test-${Date.now()}`,
            productId: stateItem.barcode,
            itemId: stateItem._id,
            fullName: stateItem.fullName?.fullName || 'Unknown',
            size: stateItem.size?.Roz_Opis || 'Unknown',
            barcode: stateItem.barcode,
            date: new Date()
        });
        
        await history.save();
        results.steps.push(`History entry created: ${history._id}`);
        
        results.success = true;
        results.transferId = transfer._id;
        results.newStateId = newState._id;
        results.historyId = history._id;
        
    } catch (error) {
        results.steps.push(`Error: ${error.message}`);
        results.error = error.message;
    }
    
    return results;
}

module.exports = router;
