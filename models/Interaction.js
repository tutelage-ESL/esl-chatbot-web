module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Interaction', {
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
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'Interactions',
    timestamps: true
  });
};