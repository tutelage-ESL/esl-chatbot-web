const { DataTypes, Sequelize } = require('sequelize');
const config = require('../config/config.json')[process.env.NODE_ENV || 'development'];

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

const Vocabulary = sequelize.define('Vocabulary', {
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
  word: {
    type: DataTypes.STRING,
    allowNull: false
  },
  definition: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pronunciation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  example: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    allowNull: true,
    defaultValue: 'beginner'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  practiceCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  lastPracticed: {
    type: DataTypes.DATE,
    allowNull: true
  },
  masteryLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  }
}, {
  tableName: 'vocabularies',
  timestamps: true
});

module.exports = Vocabulary;