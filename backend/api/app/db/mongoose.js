const mongoose = require('mongoose');
const config = require('../config.js');

const dbURI = config.database
mongoose.connect(dbURI)
    .then(() => console.log('Connected to MongoDB successfully'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

module.exports = mongoose;



