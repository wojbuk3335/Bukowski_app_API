const { json } = require('body-parser');
const dotenv = require('dotenv');
dotenv.config({path: '../.env'});

module.exports = {
  port: process.env.PORT || 3000,
  database: process.env.DATABASE || 'mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp',
  jsonwebtoken: process.env.JWT_SECRET || 'fqwfqwfqwqwdffqw', // Ensure this matches the secret used in jwt.sign and jwt.verify
  domain: process.env.DOMAIN || 'http://localhost:3000'
};