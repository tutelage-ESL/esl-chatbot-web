module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Goal', {
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
      allowNull: false,
      defaultValue: 0
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'Goals',
    timestamps: true
  });
};