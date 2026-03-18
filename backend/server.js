'use strict';

/**
 * server.js — ONLY responsibility: sync DB → init services → listen.
 * All Express setup lives in src/app.js.
 */

require('dotenv').config();

const { server } = require('./src/app');
const db = require('./models');
const elevenLabsService = require('./services/elevenLabsService');
const config = require('./src/config');

db.sequelize.sync({ alter: false })
  .then(async () => {
    console.log('Database synchronized successfully.');
    await elevenLabsService.init();
    server.listen(config.port, () => {
      console.log(`API Server is running on port ${config.port}`);
      console.log(`Frontend should connect to: http://localhost:${config.port}`);
    });
  })
  .catch(err => {
    console.error('Unable to synchronize the database:', err);
    process.exit(1);
  });
