const mongoose = require('mongoose');
const Transfer = require('./app/db/models/transfer');
const config = require('./app/config');

mongoose.connect(config.database, { useNewUrlParser: true, useUnifiedTopology: true });

Transfer.findById('68f164c6a6af4606cbb3acb7')
.then(transfer => {
  console.log('TRANSFER STATUS:');
  console.log(`ID: ${transfer._id}`);
  console.log(`Route: ${transfer.transfer_from} → ${transfer.transfer_to}`);
  console.log(`processed: ${transfer.processed}`);
  console.log(`blueProcessed: ${transfer.blueProcessed}`);
  console.log(`yellowProcessed: ${transfer.yellowProcessed}`);
  console.log(`blueProcessedAt: ${transfer.blueProcessedAt}`);
  console.log(`yellowProcessedAt: ${transfer.yellowProcessedAt}`);
  process.exit();
})
.catch(err => {
  console.error('Error:', err);
  process.exit(1);
});