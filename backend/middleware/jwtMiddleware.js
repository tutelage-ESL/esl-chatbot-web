'use strict';
// Backward-compat shim — consumers of `./jwtMiddleware` keep working.
// Canonical location: middleware/auth.middleware.js
module.exports = require('./auth.middleware');
