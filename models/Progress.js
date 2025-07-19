'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Progress extends Model {
    static associate(models) {
      Progress.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }

  Progress.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    totalWordsTyped: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    lastActiveDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    activities: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    chatMessageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'Progress',
  });

  return Progress;
};