module.exports = (sequelize, DataTypes) => {
  const Interaction = sequelize.define('Interaction', {
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
      type: DataTypes.ENUM('text', 'voice', 'pronunciation', 'vocabulary', 'goal', 'lesson'),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User input message'
    },
    responsePreview: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Preview of AI response'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional data like scores, word practiced, etc.'
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Session identifier for grouping interactions'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in seconds for voice/pronunciation activities'
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Score for pronunciation or other graded activities'
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'interactions',
    timestamps: true,
    indexes: [
      {
        fields: ['userId', 'timestamp']
      },
      {
        fields: ['type']
      },
      {
        fields: ['sessionId']
      }
    ]
  });

  // Define associations
  Interaction.associate = function(models) {
    Interaction.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    });
  };

  return Interaction;
};