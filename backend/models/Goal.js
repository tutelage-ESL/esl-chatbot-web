module.exports = (sequelize, DataTypes) => {
  const Goal = sequelize.define('Goal', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Goal type: vocabulary, pronunciation, conversation, etc.'
    },
    target: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Target value (e.g., 50 words, 10 conversations)'
    },
    timeframe: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'week, month, quarter'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    difficulty: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: true,
      defaultValue: 'intermediate'
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Progress percentage 0-100'
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'paused', 'cancelled'),
      allowNull: false,
      defaultValue: 'active'
    },
    milestones: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of milestone objects'
    },
    actionPlan: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of action plan strings'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW
    },
    targetDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    currentStreak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    bestStreak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    completedMilestones: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    lastProgressUpdate: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'goals',
    timestamps: true
  });

  // Define associations
  Goal.associate = function (models) {
    Goal.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    });
  };

  return Goal;
};