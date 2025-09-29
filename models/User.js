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
    subscriptionTier: {
      type: DataTypes.ENUM('standard', 'gold', 'diamond'),
      allowNull: false,
      defaultValue: 'standard',
    },
    monthlyTtsUsage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'TTS usage in seconds for current month'
    },
    lastUsageReset: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Last time monthly usage was reset'
    },
  }, {
    tableName: 'users',
    timestamps: true
  });

  // Instance methods for subscription management
  User.prototype.getTierLimits = function() {
    const limits = {
      standard: 20 * 60, // 20 minutes in seconds
      gold: 60 * 60,     // 1 hour in seconds
      diamond: 120 * 60  // 2 hours in seconds
    };
    return limits[this.subscriptionTier] || limits.standard;
  };

  User.prototype.getRemainingUsage = function() {
    return Math.max(0, this.getTierLimits() - this.monthlyTtsUsage);
  };

  User.prototype.canUseService = function(requestedSeconds = 0) {
    return this.getRemainingUsage() >= requestedSeconds;
  };

  User.prototype.shouldResetUsage = function() {
    const now = new Date();
    const lastReset = new Date(this.lastUsageReset);
    return now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
  };

  User.prototype.resetMonthlyUsage = function() {
    this.monthlyTtsUsage = 0;
    this.lastUsageReset = new Date();
    return this.save();
  };

  User.prototype.addUsage = function(seconds) {
    this.monthlyTtsUsage += seconds;
    return this.save();
  };

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