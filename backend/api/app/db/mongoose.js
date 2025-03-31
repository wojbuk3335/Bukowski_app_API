const mongoose = require('mongoose');
const { database } = require('../config');

mongoose.connect(database)
  .then(() => {
    // display a message if the connection is successful
    console.log('Successfully connected to the database');
  })
  .catch((error) => {
    // display a message if the connection fails
    console.log('Error connecting to the database', error);
  });


  // const mongoose = require("mongoose");

  // async function sendNotification(message) {
  //   console.log("Notification:", message);
  // }

  // async function connectToDatabase() {
  //   try {
  //     // Adjusted connection string for MongoDB 4.0.3
  //     // Note: Replace <password> with the actual password, ensuring special characters are URL encoded if necessary
  //     await mongoose.connect('mongodb://server846283_bukowskiapp:Jezusmoimpanem40@mongodb.server846283.nazwa.pl:4005/server846283_bukowskiapp', {});
  //     // await mongoose.connect('mongodb://total-projfi_Seminarium:9LNSWh9bSh@mongodb.total-projfi.nazwa.pl:4010/total-projfi_Seminarium');
  //     // await mongoose.connect("mongodb://localhost:27017/IS", {});
  //     console.log("Successfully connected to MongoDB.");
  //     await sendNotification("Successfully connected to MongoDB.");
  //   } catch (err) {
  //     console.error("Failed to connect to MongoDB:", err);
  //     await sendNotification(`Failed to connect to MongoDB: ${err}`);
  //   }
  // }

  // connectToDatabase();