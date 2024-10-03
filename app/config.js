const { json } = require('body-parser');

require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  database: process.env.DATABASE || 'mongodb://localhost:27017/node-kurs',
  jsonwebtoken: process.env.JWT_SECRET || 'secret'
};