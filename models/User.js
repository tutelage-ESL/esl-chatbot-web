module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'users',
    timestamps: true
  });

  // Define associations
  User.associate = function(models) {
    User.hasMany(models.Message, {
      foreignKey: 'userId',
      as: 'messages',
      constraints: false
    });
    User.hasMany(models.Vocabulary, {
      foreignKey: 'userId',
      as: 'vocabulary',
      constraints: false
    });
    User.hasMany(models.Goal, {
      foreignKey: 'userId',
      as: 'goals',
      constraints: false
    });
    User.hasMany(models.Progress, {
      foreignKey: 'userId',
      as: 'progress',
      constraints: false
    });
    User.hasMany(models.Interaction, {
      foreignKey: 'userId',
      as: 'interactions',
      constraints: false
    });
    User.hasOne(models.Settings, {
      foreignKey: 'userId',
      as: 'settings',
      constraints: false
    });
    User.hasOne(models.UserMetrics, {
      foreignKey: 'userId',
      as: 'metrics',
      constraints: false
    });
  };

  return User;
};