const mongoose = require('mongoose');
const {database}= require('../config');

mongoose.connect(database)
  .then(() => {
    // display a message if the connection is successful
    console.log('Successfully connected to the database');
  })
  .catch((error) => {
    // display a message if the connection fails
    console.log('Error connecting to the database');
  });