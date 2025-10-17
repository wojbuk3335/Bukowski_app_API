const mongoose = require('mongoose');
const Transfer = require('./app/db/models/transfer');
const config = require('./app/config');

mongoose.connect(config.database, { useNewUrlParser: true, useUnifiedTopology: true });

// Reset transfer 68f16132cb0c39a628678dc6
Transfer.findByIdAndUpdate('68f16132cb0c39a628678dc6', {
  processed: false,
  processedAt: null,
  blueProcessed: false,
  blueProcessedAt: null,
  yellowProcessed: false,
  yellowProcessedAt: null
})
.then(() => {
  console.log('✅ Transfer 68f16132cb0c39a628678dc6 został zresetowany');
  process.exit();
})
.catch(err => {
  console.error('Error:', err);
  process.exit(1);
});