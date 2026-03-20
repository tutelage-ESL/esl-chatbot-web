'use strict';

/**
 * models/UserMetrics.js
 *
 * Running totals and current skill scores for a student.
 * One row per student — updated incrementally as activity occurs.
 * Use Progress (daily snapshots) for historical/analytics queries;
 * use UserMetrics for the live dashboard widgets.
 */
module.exports = (sequelize, DataTypes) => {
  const UserMetrics = sequelize.define('UserMetrics', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },

    // ── Running totals ────────────────────────────────────────
    totalStudyTimeMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalWordsTyped: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lessonsCompleted: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    // ── Streak tracking ───────────────────────────────────────
    currentStreak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Consecutive days with at least one study session.',
    },
    longestStreak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastStudyDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    // ── AI-assessed level ─────────────────────────────────────
    estimatedLevel: {
      type: DataTypes.ENUM(
        'beginner', 'elementary', 'intermediate',
        'upper-intermediate', 'advanced', 'proficient'
      ),
      allowNull: true,
      comment: 'AI-derived proficiency level, updated after each session.',
    },

    // ── Skill scores (0-100) ──────────────────────────────────
    grammarSkill: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    vocabularySkill: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    readingSkill: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    writingSkill: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    speakingSkill: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    listeningSkill: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
  }, {
    tableName: 'user_metrics',
    timestamps: true,
  });

  UserMetrics.associate = function (models) {
    UserMetrics.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false,
    });
  };

  return UserMetrics;
};
