'use strict';

/**
 * models/Vocabulary.js
 *
 * Stores words a student has saved to their vocabulary list.
 * Includes Spaced Repetition System (SRS) fields so the app can
 * schedule flashcard reviews optimally (SM-2 algorithm style).
 *
 * SRS field semantics:
 *   srsInterval — days until the next review (starts at 1)
 *   srsDue      — absolute date of next scheduled review
 *   srsEase     — difficulty multiplier (2.5 = normal; lower = harder word)
 */
module.exports = (sequelize, DataTypes) => {
  const Vocabulary = sequelize.define('Vocabulary', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // ── Word data ─────────────────────────────────────────────
    word: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    definition: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pronunciation: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'IPA or phonetic transcription.',
    },
    example: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Example sentence using the word.',
    },
    partOfSpeech: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: 'e.g. noun, verb, adjective',
    },
    difficulty: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: false,
      defaultValue: 'beginner',
    },
    category: {
      type: DataTypes.STRING(60),
      allowNull: true,
      comment: 'Topic category (e.g. business, travel, food).',
    },

    // ── SRS scheduling ────────────────────────────────────────
    srsInterval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Days until next scheduled review.',
    },
    srsDue: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date when this card is due for review.',
    },
    srsEase: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 2.5,
      comment: 'SM-2 ease factor. Range: 1.3 – 5.0.',
    },

    // ── Practice history ──────────────────────────────────────
    reviewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    correctCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    incorrectCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    masteryLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '0 = new, 1-4 = learning, 5 = mastered. Derived from correctCount/reviewCount.',
      validate: { min: 0, max: 5 },
    },
    lastPracticed: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'vocabularies',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'srsDue'] },
      { fields: ['userId', 'category'] },
    ],
  });

  Vocabulary.associate = function (models) {
    Vocabulary.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false,
    });
  };

  return Vocabulary;
};