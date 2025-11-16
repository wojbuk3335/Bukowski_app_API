const mongoose = require("mongoose");
const config = require ('../config')

// Ustaw strictQuery aby pozbyć się ostrzeżenia
mongoose.set('strictQuery', false);

async function sendNotification(message) {
  console.log("Notification:", message);
}

async function connectToDatabase() {
  try {
    await mongoose.connect(config.database), {};
    // Connected to MongoDB silently
    // await sendNotification("Successfully connected to MongoDB."); // DISABLED - no need for notification
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    await sendNotification(`Failed to connect to MongoDB: ${err}`);
  }
}

connectToDatabase();