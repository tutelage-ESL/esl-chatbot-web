module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Settings', {
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
    language: {
      type: DataTypes.STRING,
      defaultValue: 'en'
    },
    voiceSpeed: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0
    },
    autoSpeak: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'Settings',
    timestamps: true
  });
};