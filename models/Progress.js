module.exports = (sequelize, DataTypes) => {
  const Progress = sequelize.define('Progress', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
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
    tableName: 'progresses',
    timestamps: true
  });

  // Define associations
  Progress.associate = function(models) {
    Progress.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    });
  };

  return Progress;
};