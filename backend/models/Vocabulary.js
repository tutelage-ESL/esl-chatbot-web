module.exports = (sequelize, DataTypes) => {
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

  // Define associations
  Vocabulary.associate = function(models) {
    Vocabulary.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    });
  };

  return Vocabulary;
};