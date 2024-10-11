const { json } = require('body-parser');

require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  database: process.env.DATABASE || 'mongodb+srv://wbukowski1985:Jezusmoimpanem30@bukowskiapp.emdzg.mongodb.net/?retryWrites=true&w=majority&appName=BukowskiApp',
  jsonwebtoken: process.env.JWT_SECRET || 'secret'
};