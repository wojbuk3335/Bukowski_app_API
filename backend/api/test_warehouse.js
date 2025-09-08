const mongoose = require('mongoose');
const State = require('./app/db/models/state');
const User = require('./app/db/models/user');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/bukowski_local', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function createTestWarehouseItem() {
    try {
        console.log('Creating test warehouse item...');
        
        // Find the warehouse user (MAGAZYN)
        const warehouseUser = await User.findOne({ symbol: 'MAGAZYN' });
        console.log('Warehouse user:', warehouseUser);
        
        if (!warehouseUser) {
            console.error('Warehouse user not found');
            return;
        }

        const testItem = new State({
            _id: new mongoose.Types.ObjectId(),
            fullName: new mongoose.Types.ObjectId("68b90d490d85065109013908"),
            date: new Date(),
            size: new mongoose.Types.ObjectId("68b90d3a0d850651090138da"),
            barcode: "TEST_WAREHOUSE_001",
            sellingPoint: warehouseUser._id,
            price: 1390,
            discount_price: 0
        });

        await testItem.save();
        console.log('Test warehouse item created:', testItem._id);
        
        // Verify it was created
        const wareItems = await State.find({ sellingPoint: warehouseUser._id })
            .populate('fullName')
            .populate('size')
            .populate('sellingPoint');
        
        console.log('Current warehouse items:', wareItems.length);
        wareItems.forEach(item => {
            console.log(`- ${item._id}: ${item.fullName?.fullName} ${item.size?.Roz_Opis} (${item.barcode})`);
        });
        
    } catch (error) {
        console.error('Error creating test item:', error);
    }
    
    mongoose.disconnect();
}

createTestWarehouseItem();
