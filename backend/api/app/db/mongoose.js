const mongoose = require("mongoose");
const config = require ('../config')

async function sendNotification(message) {
  console.log("Notification:", message);
}

async function connectToDatabase() {
  try {
    await mongoose.connect(config.database), {};
    console.log("Successfully connected to MongoDB.");
    await sendNotification("Successfully connected to MongoDB.");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    await sendNotification(`Failed to connect to MongoDB: ${err}`);
  }
}

connectToDatabase();