module.exports = (sequelize, DataTypes) => {
  return sequelize.define('UserMetrics', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id'
      }
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
    goalInteractions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    lessonInteractions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'UserMetrics',
    timestamps: true
  });
};