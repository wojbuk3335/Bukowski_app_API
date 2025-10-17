const mongoose = require('mongoose');
const Transfer = require('./app/models/transfer');
const config = require('./app/config');

mongoose.connect(config.database, { useNewUrlParser: true, useUnifiedTopology: true });

Transfer.find({ processed: false })
  .populate('goods', 'fullName')
  .sort({ createdAt: 1 })
  .then(transfers => {
    console.log('NIEPRZETWORZONE TRANSFERY:');
    transfers.forEach((t, i) => {
      console.log(`${i+1}. ID: ${t._id}`);
      console.log(`   Route: ${t.transfer_from} → ${t.transfer_to}`);
      console.log(`   Product: ${t.goods?.fullName || 'Unknown'}`);
      console.log(`   Quantity: ${t.quantity}`);
      console.log(`   Created: ${t.createdAt}`);
      console.log(`   Processed: ${t.processed}`);
      console.log('');
    });
    process.exit();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });