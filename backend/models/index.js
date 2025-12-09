const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;

const pgUrl = process.env.DATABASE_URL || (
  process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE
    ? `postgres://${encodeURIComponent(process.env.PGUSER)}:${encodeURIComponent(process.env.PGPASSWORD || '')}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}?sslmode=require`
    : null
);

const sanitizedUrl = pgUrl ? pgUrl.replace(/channel_binding=require/gi, 'channel_binding=disable') : null;

if (sanitizedUrl) {
  sequelize = new Sequelize(sanitizedUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  });
} else if (config.use_env_variable && process.env[config.use_env_variable]) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  if (config.database && config.username) {
    sequelize = new Sequelize(config.database, config.username, config.password, config);
  } else {
    sequelize = new Sequelize('sqlite::memory:');
  }
}

// Import and initialize models with sequelize instance
db.User = require('./User')(sequelize, Sequelize.DataTypes);
db.Message = require('./Message')(sequelize, Sequelize.DataTypes);
db.Progress = require('./Progress')(sequelize, Sequelize.DataTypes);
db.Settings = require('./Settings')(sequelize, Sequelize.DataTypes);
db.Vocabulary = require('./Vocabulary')(sequelize, Sequelize.DataTypes);
db.Goal = require('./Goal')(sequelize, Sequelize.DataTypes);
db.Interaction = require('./Interaction')(sequelize, Sequelize.DataTypes);
db.UserMetrics = require('./UserMetrics')(sequelize, Sequelize.DataTypes);

// Handle associations if they exist
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
