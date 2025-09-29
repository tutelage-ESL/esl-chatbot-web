const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
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