'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Settings extends Model {
    static associate(models) {
      Settings.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }

  Settings.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
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
    sequelize,
    modelName: 'Settings',
  });

  return Settings;
};