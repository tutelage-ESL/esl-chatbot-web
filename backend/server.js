'use strict';

/**
 * server.js — ONLY responsibility: sync DB → init services → listen.
 * All Express setup lives in src/app.js.
 */

require('dotenv').config();

const { server } = require('./src/app');
const db = require('./src/models');
const elevenLabsService = require('./src/services/elevenlabs.service');
const config = require('./src/config');
const { runSeeders } = require('./seeders/seed');

db.sequelize.sync({ alter: true })
  .then(async () => {
    console.log('Database synchronized successfully.');
    if (process.env.NODE_ENV === 'development') {
      await runSeeders(db);
    }
    await elevenLabsService.init();
    server.listen(config.port, () => {
      console.log(`[v1] API Server running on port ${config.port}`);
    });
  })
  .catch(err => {
    console.error('Database sync failed:', err);
    process.exit(1);
  });
