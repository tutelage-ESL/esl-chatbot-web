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

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Import and initialize models
// Models expect db.sequelize to be defined

const UserModel = require('./User');
db.User = UserModel(sequelize, Sequelize.DataTypes);

const MessageModel = require('./Message');
db.Message = MessageModel(sequelize, Sequelize.DataTypes);

const ProgressModel = require('./Progress');
db.Progress = ProgressModel(sequelize, Sequelize.DataTypes);

const SettingsModel = require('./Settings');
db.Settings = SettingsModel(sequelize, Sequelize.DataTypes);

const VocabularyModel = require('./Vocabulary');
db.Vocabulary = VocabularyModel(sequelize, Sequelize.DataTypes);

const GoalModel = require('./Goal');
db.Goal = GoalModel(sequelize, Sequelize.DataTypes);

const InteractionModel = require('./Interaction');
db.Interaction = InteractionModel(sequelize, Sequelize.DataTypes);

const UserMetricsModel = require('./UserMetrics');
db.UserMetrics = UserMetricsModel(sequelize, Sequelize.DataTypes);

// Handle associations if they exist
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;