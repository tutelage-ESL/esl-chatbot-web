'use strict';

/**
 * src/models/index.js
 *
 * Initialises Sequelize, loads every model, then wires up associations.
 * Connection priority:
 *   1. DATABASE_URL env var (or PGHOST/PGUSER/PGDATABASE combo) → PostgreSQL
 *   2. config.json use_env_variable → any dialect via connection string
 *   3. config.json explicit credentials → MySQL / PostgreSQL
 *   4. SQLite in-memory fallback (development / test)
 */
const path      = require('path');
const Sequelize = require('sequelize');
const process   = require('process');

const env    = process.env.NODE_ENV || 'development';
console.log(`[models/index.js] Environment set to: ${env}`);
const config = require(path.join(__dirname, '/../../config/config.json'))[env] || {};
console.log(`[models/index.js] Config loaded for env: ${env}`);
const db     = {};

// ── Connection setup ──────────────────────────────────────────────────────────
let sequelize;

const isProduction = env === 'production';

const pgUrl = process.env.DATABASE_URL || (
  process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE
    ? `postgres://${encodeURIComponent(process.env.PGUSER)}:${encodeURIComponent(process.env.PGPASSWORD || '')}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}`
    : null
);

const sanitizedUrl = pgUrl
  ? pgUrl.replace(/channel_binding=require/gi, 'channel_binding=disable')
  : null;

if (sanitizedUrl) {
  console.log('[models/index.js] Connecting to database using sanitized URL (Postgres)');
  sequelize = new Sequelize(sanitizedUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    ...(isProduction && {
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    }),
    logging: false,
  });
} else if (config.use_env_variable && process.env[config.use_env_variable]) {
  console.log(`[models/index.js] Connecting using env variable: ${config.use_env_variable}`);
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else if (config.database && config.username) {
  console.log(`[models/index.js] Connecting using explicit config credentials for DB: ${config.database}`);
  sequelize = new Sequelize(config.database, config.username, config.password, config);
} else {
  console.log('[models/index.js] Connecting to sqlite::memory: fallback');
  sequelize = new Sequelize('sqlite::memory:', { logging: false });
}

// ── Model registration ────────────────────────────────────────────────────────
// Core identity
db.User                = require('./User')(sequelize, Sequelize.DataTypes);

// Student-only profile & billing
db.LearnerProfile      = require('./LearnerProfile')(sequelize, Sequelize.DataTypes);
db.Subscription        = require('./Subscription')(sequelize, Sequelize.DataTypes);

// Conversation & messaging
db.ConversationSession = require('./ConversationSession')(sequelize, Sequelize.DataTypes);
db.Message             = require('./Message')(sequelize, Sequelize.DataTypes);

// Learning content
db.Vocabulary          = require('./Vocabulary')(sequelize, Sequelize.DataTypes);
db.Goal                = require('./Goal')(sequelize, Sequelize.DataTypes);

// Analytics & metrics
db.Progress            = require('./Progress')(sequelize, Sequelize.DataTypes);
db.UserMetrics         = require('./UserMetrics')(sequelize, Sequelize.DataTypes);

// ── Wire up associations ──────────────────────────────────────────────────────
console.log(`[models/index.js] Registered models: ${Object.keys(db).join(', ')}`);
console.log('[models/index.js] Wiring up associations...');
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});
console.log('[models/index.js] Associations wired up successfully');

db.sequelize = sequelize;
db.Sequelize = Sequelize;

console.log('[models/index.js] Database initialization complete, exporting db object');
module.exports = db;
