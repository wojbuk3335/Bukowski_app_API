const { json } = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({path: path.join(__dirname, '../.env')});



module.exports = {
  port: process.env.PORT || 3000,
  // 🔒 BEZPIECZNA KONFIGURACJA - wszystkie dane z .env
  database: process.env.DATABASE || (() => {
    console.error('❌ BŁĄD: Brak konfiguracji DATABASE w .env!');
    console.error('💡 Dodaj: DATABASE=mongodb+srv://username:password@cluster.mongodb.net/database');
    process.exit(1);
  })(),
  // 🔒 JWT Secret - MUSI być w .env!
  jsonwebtoken: process.env.JWT_SECRET || (() => {
    console.error('❌ BŁĄD: Brak JWT_SECRET w .env!');
    console.error('💡 Wygeneruj silny klucz: openssl rand -base64 64');
    process.exit(1);
  })(),
  domain: process.env.DOMAIN || 'http://localhost:3000'
};