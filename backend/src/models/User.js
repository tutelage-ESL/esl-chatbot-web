'use strict';

/**
 * models/User.js
 *
 * Core identity record. Roles:
 *   student  — created by a tutor; has LearnerProfile + Subscription
 *   tutor    — created by an admin; manages a roster of students
 *   admin    — created at the system level; manages tutors + has full visibility
 *
 * Associations (all set in User.associate):
 *   student  → belongsTo User (as 'tutor')   via tutorId
 *   tutor    → hasMany   User (as 'students') via tutorId
 *   tutor    → belongsTo User (as 'admin')    via adminId
 *   admin    → hasMany   User (as 'tutors')   via adminId
 *   student  → hasOne    LearnerProfile
 *   student  → hasOne    Subscription
 *   student  → hasOne    UserMetrics
 *   student  → hasMany   ConversationSession
 *   student  → hasMany   Message
 *   student  → hasMany   Vocabulary
 *   student  → hasMany   Goal
 *   student  → hasMany   Progress
 */
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // ── Identity ──────────────────────────────────────────────
    username: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    displayName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Friendly name shown in the UI',
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // ── Role & hierarchy ──────────────────────────────────────
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'student',
      validate: { isIn: [['student', 'tutor', 'admin']] },
    },
    /**
     * tutorId  — set on student rows; points to the tutor who owns them.
     * adminId  — set on tutor rows; points to the admin who registered them.
     * Both are null for admin accounts (root level).
     */
    tutorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      comment: 'FK → users(id). Populated on student rows only.',
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      comment: 'FK → users(id). Populated on tutor rows only.',
    },

    // ── Contact / extra attributes (tutors & admins) ──────────
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: 'Optional phone number — primarily for tutors and admins.',
    },

    // ── Student-specific quick-access field ───────────────────
    nativeLanguage: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Student native language — used by AI to personalise explanations.',
    },
  }, {
    tableName: 'users',
    timestamps: true, // createdAt + updatedAt generated automatically
  });

  // ── Associations ─────────────────────────────────────────────
  User.associate = function (models) {
    // Hierarchy
    User.belongsTo(models.User, { foreignKey: 'tutorId', as: 'tutor', constraints: false });
    User.hasMany(models.User,   { foreignKey: 'tutorId', as: 'students', constraints: false });
    User.belongsTo(models.User, { foreignKey: 'adminId', as: 'admin',   constraints: false });
    User.hasMany(models.User,   { foreignKey: 'adminId', as: 'tutors',  constraints: false });

    // Student-owned records
    User.hasOne(models.LearnerProfile, {
      foreignKey: 'userId', as: 'learnerProfile', constraints: false,
    });
    User.hasOne(models.Subscription, {
      foreignKey: 'userId', as: 'subscription', constraints: false,
    });
    User.hasOne(models.UserMetrics, {
      foreignKey: 'userId', as: 'metrics', constraints: false,
    });
    User.hasMany(models.ConversationSession, {
      foreignKey: 'userId', as: 'sessions', constraints: false,
    });
    User.hasMany(models.Message, {
      foreignKey: 'userId', as: 'messages', constraints: false,
    });
    User.hasMany(models.Vocabulary, {
      foreignKey: 'userId', as: 'vocabulary', constraints: false,
    });
    User.hasMany(models.Goal, {
      foreignKey: 'userId', as: 'goals', constraints: false,
    });
    User.hasMany(models.Progress, {
      foreignKey: 'userId', as: 'progressHistory', constraints: false,
    });
  };

  return User;
};
