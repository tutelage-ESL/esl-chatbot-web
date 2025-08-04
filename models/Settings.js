const { DataTypes, Sequelize } = require('sequelize');
const config = require('../config/config.json')[process.env.NODE_ENV || 'development'];

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

const Settings = sequelize.define('Settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: 'en'
  },
  voiceSpeed: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0
  },
  autoSpeak: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'Settings',
  timestamps: true
});

module.exports = Settings;