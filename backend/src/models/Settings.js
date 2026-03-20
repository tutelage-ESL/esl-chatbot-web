module.exports = (sequelize, DataTypes) => {
  const Settings = sequelize.define('Settings', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
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
    tableName: 'settings',
    timestamps: true
  });

  // Define associations
  Settings.associate = function(models) {
    Settings.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    });
  };

  return Settings;
};
