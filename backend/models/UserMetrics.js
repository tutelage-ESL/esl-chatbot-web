module.exports = (sequelize, DataTypes) => {
  const UserMetrics = sequelize.define('UserMetrics', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
  totalInteractions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  textInteractions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  voiceInteractions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  pronunciationInteractions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  vocabularyInteractions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  commandsUsed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lessonsCompleted: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  practiceSessionsCompleted: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  totalWordsTyped: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  chatMessageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  estimatedLevel: {
    type: DataTypes.ENUM('beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced', 'proficient'),
    allowNull: true
  },
  // Skill metrics (0-100 scale)
  grammarSkill: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, max: 100 }
  },
  vocabularySkill: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, max: 100 }
  },
  readingSkill: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, max: 100 }
  },
  writingSkill: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, max: 100 }
  },
  speakingSkill: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, max: 100 }
  },
  listeningSkill: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, max: 100 }
  },
  // Study time tracking
  totalStudyTimeMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  currentStreak: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  longestStreak: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lastStudyDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  // Progress tracking
  overallProgress: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, max: 100 }
  },
  weeklyGoalMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 300 // 5 hours default
  },
  lastUpdated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
    tableName: 'usermetrics',
    timestamps: true
  });

  // Define associations
  UserMetrics.associate = function(models) {
    UserMetrics.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    });
  };

  return UserMetrics;
};