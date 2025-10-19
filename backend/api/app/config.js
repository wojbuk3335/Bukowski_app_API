const { json } = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({path: path.join(__dirname, '../.env')});



module.exports = {
  port: process.env.PORT || 3000,
  // Baza testowa dla developmentu, produkcja używa .env na serwerze
  database: process.env.DATABASE || 'mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp',
  // JWT Secret - na produkcji musi być w .env z silnym kluczem
  jsonwebtoken: process.env.JWT_SECRET || 'test-secret-only-for-development-change-in-production',
  domain: process.env.DOMAIN || 'http://localhost:3000'
};