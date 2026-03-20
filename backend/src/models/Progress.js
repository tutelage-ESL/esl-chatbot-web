'use strict';

/**
 * models/Progress.js
 *
 * Daily snapshot ledger — one row per student per calendar day.
 * Records what the student did that day so over-time analytics
 * (charts, weekly summaries, tutor dashboards) can be queried
 * with a simple date-range filter.
 *
 * Unique index on (userId, date) prevents duplicate daily rows.
 * Controllers should use upsert on this pair.
 */
module.exports = (sequelize, DataTypes) => {
  const Progress = sequelize.define('Progress', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // ── Date (one row per day) ────────────────────────────────
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Calendar date of this snapshot (YYYY-MM-DD).',
    },

    // ── Activity counts ───────────────────────────────────────
    studyMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    messagesCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total messages sent by the student today.',
    },
    wordsTyped: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    vocabularyPracticed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of vocabulary cards reviewed today.',
    },
    goalsAdvanced: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of goals that received progress updates today.',
    },

    // ── Scores ────────────────────────────────────────────────
    pronunciationScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Average pronunciation score for the day (0-100). Null if no pronunciation sessions.',
    },

    // ── Skill snapshot ────────────────────────────────────────
    /**
     * skillSnapshot — JSON object capturing skill levels at end of day.
     * Allows time-series charts without touching UserMetrics history.
     * Shape:
     * {
     *   grammar:     number (0-100),
     *   vocabulary:  number (0-100),
     *   reading:     number (0-100),
     *   writing:     number (0-100),
     *   speaking:    number (0-100),
     *   listening:   number (0-100)
     * }
     */
    skillSnapshot: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
  }, {
    tableName: 'progress',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'date'],
        name: 'progress_user_date_unique',
      },
      { fields: ['userId', 'date'] },
    ],
  });

  Progress.associate = function (models) {
    Progress.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false,
    });
  };

  return Progress;
};
