'use strict';

/**
 * seeders/seed.js
 * Inserts default development data once — skips if records already exist.
 * Called automatically on server start when NODE_ENV=development.
 */
const bcrypt = require('bcryptjs'); // or bcrypt — match whatever you use in User.js

async function seedUsers(db) {
  const users = [
    {
      username: 'alice',
      email: 'alice@dev.local',
      password: await bcrypt.hash('password123', 10),
      role: 'student',
    },
    {
      username: 'bob',
      email: 'bob@dev.local',
      password: await bcrypt.hash('password123', 10),
      role: 'student',
    },
    {
      username: 'admin',
      email: 'admin@dev.local',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
    },
  ];

  for (const userData of users) {
    const [, created] = await db.User.findOrCreate({
      where: { email: userData.email }, // unique key — won't duplicate
      defaults: userData,
    });
    if (created) console.log(`[seed] Created user: ${userData.email}`);
    else console.log(`[seed] Already exists, skipped: ${userData.email}`);
  }
}

async function runSeeders(db) {
  console.log('[seed] Running development seeders…');
  await seedUsers(db);
  console.log('[seed] Done.');
}

module.exports = { runSeeders };