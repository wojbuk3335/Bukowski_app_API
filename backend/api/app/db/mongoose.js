const mongoose = require("mongoose");

async function sendNotification(message) {
  console.log("Notification:", message);
}

async function connectToDatabase() {
  try {
    // Adjusted connection string for MongoDB 4.0.3
    // Note: Replace <password> with the actual password, ensuring special characters are URL encoded if necessary
    await mongoose.connect('mongodb+srv://wbukowski1985:Jezusmoimpanem30@bukowskiapp.emdzg.mongodb.net/?retryWrites=true&w=majority&appName=BukowskiApp', {});
    // await mongoose.connect('mongodb+srv://wbukowski1985:<db_password>@bukowskiapp.emdzg.mongodb.net/?retryWrites=true&w=majority&appName=BukowskiApp');
    // await mongoose.connect("mongodb://server846283_bukowskiapp:Bukowski1234@mongodb.server846283.nazwa.pl:4005/server846283_bukowskiapp", {});
    console.log("Successfully connected to MongoDB.");
    await sendNotification("Successfully connected to MongoDB.");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    await sendNotification(`Failed to connect to MongoDB: ${err}`);
  }
}

connectToDatabase();