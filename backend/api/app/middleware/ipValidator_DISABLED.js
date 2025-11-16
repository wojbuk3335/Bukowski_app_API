const jwt = require('jsonwebtoken');
const securityLogger = require('../services/securityLogger');

// TYMCZASOWO WYŁĄCZONY MIDDLEWARE DO WALIDACJI IP
const ipValidator = (req, res, next) => {
    // CAŁKOWICIE WYŁĄCZONE - przepuszcza wszystko
    console.log('⚠️ IP VALIDATOR DISABLED - allowing all requests');
    next();
};

// TYMCZASOWO WYŁĄCZONY middleware do dodawania IP do tokenów
const addIPToToken = (req, res, next) => {
    console.log('⚠️ ADD IP TO TOKEN DISABLED - skipping IP tracking');
    next();
};

module.exports = {
    ipValidator,
    addIPToToken
};
