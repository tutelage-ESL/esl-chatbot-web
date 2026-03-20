'use strict';

/**
 * models/LearnerProfile.js
 *
 * Student-only. One row per student user.
 * Combines the old Settings model with learning-level data.
 * Created automatically after a student account is registered.
 */
module.exports = (sequelize, DataTypes) => {
  const LearnerProfile = sequelize.define('LearnerProfile', {
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

    // ── Language level ────────────────────────────────────────
    currentLevel: {
      type: DataTypes.ENUM(
        'beginner', 'elementary', 'intermediate',
        'upper-intermediate', 'advanced', 'proficient'
      ),
      allowNull: true,
      defaultValue: 'beginner',
      comment: 'AI-assessed or self-declared current level.',
    },
    targetLevel: {
      type: DataTypes.ENUM(
        'beginner', 'elementary', 'intermediate',
        'upper-intermediate', 'advanced', 'proficient'
      ),
      allowNull: true,
      defaultValue: 'intermediate',
      comment: 'Level the student is working toward.',
    },

    // ── Learning context ──────────────────────────────────────
    learningPurpose: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'e.g. travel, work, exam, casual',
    },
    topicsOfInterest: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of topic strings the student enjoys discussing.',
    },

    // ── AI tutor behaviour ────────────────────────────────────
    aiPersonality: {
      type: DataTypes.ENUM('friendly', 'strict', 'formal'),
      allowNull: false,
      defaultValue: 'friendly',
      comment: 'Controls the tone of the AI tutor responses.',
    },

    // ── Voice / TTS preferences ───────────────────────────────
    voiceSpeed: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.0,
      validate: { min: 0.5, max: 2.0 },
    },
    autoSpeak: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Auto-play AI responses as audio.',
    },

    // ── UI preferences ────────────────────────────────────────
    uiLanguage: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'en',
      comment: 'Interface language code (e.g. en, ar, fr).',
    },
    theme: {
      type: DataTypes.ENUM('light', 'dark', 'system'),
      allowNull: false,
      defaultValue: 'system',
    },

    // ── Study goals & scheduling ──────────────────────────────
    weeklyGoalMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 300,
      comment: 'Self-set weekly study target in minutes (default = 5 h).',
    },
    timezone: {
      type: DataTypes.STRING(60),
      allowNull: true,
      defaultValue: 'UTC',
      comment: 'IANA timezone string — used for streak calculations.',
    },
  }, {
    tableName: 'learner_profiles',
    timestamps: true,
  });

  LearnerProfile.associate = function (models) {
    LearnerProfile.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false,
    });
  };

  return LearnerProfile;
};
