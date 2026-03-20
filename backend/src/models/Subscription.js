'use strict';

/**
 * models/Subscription.js
 *
 * Student-only. One row per student user.
 * Tracks membership plan, billing period, and TTS quota usage.
 * Tutors and admins do NOT receive a subscription row.
 */
module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      comment: 'FK → users(id). Must be a student-role user.',
    },

    // ── Plan & status ─────────────────────────────────────────
    plan: {
      type: DataTypes.ENUM('free', 'basic', 'pro'),
      allowNull: false,
      defaultValue: 'free',
    },
    status: {
      type: DataTypes.ENUM('active', 'trialing', 'cancelled', 'expired'),
      allowNull: false,
      defaultValue: 'active',
    },

    // ── Billing period ────────────────────────────────────────
    currentPeriodStart: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    currentPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // ── TTS quota tracking ────────────────────────────────────
    monthlyTtsUsage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Seconds of TTS consumed in the current billing month.',
    },
    lastUsageReset: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp of the last monthly usage reset.',
    },
  }, {
    tableName: 'subscriptions',
    timestamps: true,
  });

  // ── TTS quota helpers ───────────────────────────────────────
  /** Returns the monthly TTS limit in seconds for the current plan. */
  Subscription.prototype.getTtsLimit = function () {
    const limits = {
      free:  20 * 60,   // 20 minutes
      basic: 60 * 60,   // 1 hour
      pro:   120 * 60,  // 2 hours
    };
    return limits[this.plan] ?? limits.free;
  };

  Subscription.prototype.getRemainingTts = function () {
    return Math.max(0, this.getTtsLimit() - this.monthlyTtsUsage);
  };

  Subscription.prototype.canUseService = function (requestedSeconds = 0) {
    return this.getRemainingTts() >= requestedSeconds;
  };

  Subscription.prototype.shouldResetUsage = function () {
    const now       = new Date();
    const lastReset = new Date(this.lastUsageReset);
    return (
      now.getMonth()    !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear()
    );
  };

  Subscription.prototype.resetMonthlyUsage = function () {
    this.monthlyTtsUsage = 0;
    this.lastUsageReset  = new Date();
    return this.save();
  };

  Subscription.prototype.addTtsUsage = function (seconds) {
    this.monthlyTtsUsage += seconds;
    return this.save();
  };

  // ── Associations ──────────────────────────────────────────────
  Subscription.associate = function (models) {
    Subscription.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false,
    });
  };

  return Subscription;
};
