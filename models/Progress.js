module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Progress', {
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
    activities: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'Progress',
    timestamps: true
  });
};