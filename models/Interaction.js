const { DataTypes, Sequelize } = require('sequelize');
const config = require('../config/config.json')[process.env.NODE_ENV || 'development'];

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

const Interaction = sequelize.define('Interaction', {
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

module.exports = Interaction;