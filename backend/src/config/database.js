'use strict';
const path = require('path');
const env = process.env.NODE_ENV || 'development';
const configFile = require(path.join(__dirname, '../../config/config.json'))[env] || {};
module.exports = configFile;
