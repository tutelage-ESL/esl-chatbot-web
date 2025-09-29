const { DataTypes, Sequelize } = require('sequelize');
const config = require('../config/config.json')[process.env.NODE_ENV || 'development'];

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

async function createTables() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Define Interactions table
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
        allowNull: true
      },
      responsePreview: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true
      },
      sessionId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      score: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'Interactions',
      timestamps: true
    });

    // Define UserMetrics table
    const UserMetrics = sequelize.define('UserMetrics', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
      },
      totalInteractions: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      textInteractions: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      voiceInteractions: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      pronunciationInteractions: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      vocabularyInteractions: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      goalInteractions: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      lessonInteractions: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      averageScore: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      totalStudyTime: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      streakDays: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      lastActiveDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      }
    }, {
      tableName: 'UserMetrics',
      timestamps: true
    });

    // Define Goals table
    const Goal = sequelize.define('Goal', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      category: {
        type: DataTypes.ENUM('pronunciation', 'vocabulary', 'conversation', 'grammar', 'listening', 'reading', 'writing'),
        allowNull: false
      },
      difficulty: {
        type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
        allowNull: false
      },
      targetValue: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      currentValue: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      unit: {
        type: DataTypes.STRING,
        allowNull: false
      },
      isCompleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    }, {
      tableName: 'Goals',
      timestamps: true
    });

    // Define Vocabularies table
    const Vocabulary = sequelize.define('Vocabulary', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
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
        defaultValue: 'beginner'
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true
      },
      practiceCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      lastPracticed: {
        type: DataTypes.DATE,
        allowNull: true
      },
      masteryLevel: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      }
    }, {
      tableName: 'Vocabularies',
      timestamps: true
    });
    
    console.log('Creating tables...');
    await sequelize.sync({ force: false, alter: true });
    console.log('Tables created successfully.');
    
    await sequelize.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

// Run the creation if this file is executed directly
if (require.main === module) {
  createTables();
}

module.exports = createTables;