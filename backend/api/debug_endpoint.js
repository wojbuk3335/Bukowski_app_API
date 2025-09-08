const express = require('express');
const router = express.Router();
const State = require('./app/db/models/state');
const User = require('./app/db/models/user');
const Goods = require('./app/db/models/goods');
const Size = require('./app/db/models/size');
const mongoose = require('mongoose');

router.get('/debug/database', async (req, res) => {
    try {
        console.log('🔍 Debug: Checking database connection...');
        
        // Check connection
        const isConnected = mongoose.connection.readyState === 1;
        console.log('MongoDB connection state:', mongoose.connection.readyState);
        
        // Check collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
        
        // Check State collection directly
        const stateCount = await State.countDocuments();
        console.log('State collection count:', stateCount);
        
        // Get first few documents
        const firstStates = await State.find().limit(3);
        console.log('First 3 states:', firstStates);
        
        res.json({
            connected: isConnected,
            readyState: mongoose.connection.readyState,
            collections: collections.map(c => c.name),
            stateCount: stateCount,
            firstStates: firstStates
        });
    } catch (error) {
        console.error('Debug endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create test item in specified location
router.post('/api/debug/create-test-item', async (req, res) => {
    try {
        const { location } = req.body;
        
        console.log('Creating test item in location:', location);
        
        // Find the user/location
        const user = await User.findOne({ symbol: location || 'MAGAZYN' });
        if (!user) {
            return res.status(404).json({ error: 'Location not found' });
        }
        
        // Find or create test goods
        let goods = await Goods.findOne({ fullName: 'Test Product for Undo' });
        if (!goods) {
            return res.status(404).json({ error: 'Test goods not found - please create one first' });
        }
        
        // Find or create test size
        let size = await Size.findOne({ Roz_Opis: 'TEST' });
        if (!size) {
            return res.status(404).json({ error: 'Test size not found - please create one first' });
        }
        
        // Create test state item
        const testItem = new State({
            _id: new mongoose.Types.ObjectId(),
            fullName: goods._id,
            size: size._id,
            barcode: `TEST-${Date.now()}`,
            sellingPoint: user._id,
            price: 100,
            discount_price: 0,
            date: new Date()
        });
        
        await testItem.save();
        
        console.log('Created test item:', testItem._id);
        
        res.json({
            message: 'Test item created successfully',
            itemId: testItem._id,
            location: location,
            barcode: testItem.barcode
        });
        
    } catch (error) {
        console.error('Error creating test item:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
