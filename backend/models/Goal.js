'use strict';

/**
 * models/Goal.js
 *
 * A learning objective set by a student (or assigned by their tutor).
 * Progress is tracked as a 0-100 percentage; milestones are stored as
 * a JSON array so the AI can reference them in conversation.
 */
module.exports = (sequelize, DataTypes) => {
  const Goal = sequelize.define('Goal', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'The student who owns this goal.',
    },
    assignedByTutorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK → users(id). Set when a tutor assigns the goal; null for self-created goals.',
    },

    // ── Goal definition ───────────────────────────────────────
    type: {
      type: DataTypes.STRING(60),
      allowNull: false,
      comment: 'e.g. vocabulary, pronunciation, conversation, grammar, listening',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    target: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Target value (e.g. 50 words, 10 conversations, 20 minutes).',
    },
    timeframe: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'custom'),
      allowNull: false,
      defaultValue: 'weekly',
    },
    difficulty: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: true,
      defaultValue: 'intermediate',
    },

    // ── Status & progress ─────────────────────────────────────
    status: {
      type: DataTypes.ENUM('active', 'completed', 'paused', 'cancelled'),
      allowNull: false,
      defaultValue: 'active',
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Progress percentage 0-100.',
      validate: { min: 0, max: 100 },
    },

    // ── Milestones & plan ─────────────────────────────────────
    /**
     * milestones — array of objects, e.g.:
     * [{ label: "Learn 10 words", targetValue: 10, achieved: false }]
     */
    milestones: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    /**
     * actionPlan — array of instruction strings the AI or tutor suggests.
     */
    actionPlan: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },

    // ── Dates ─────────────────────────────────────────────────
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    targetDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    completedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    lastProgressUpdate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'goals',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'status'] },
    ],
  });

  Goal.associate = function (models) {
    Goal.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false,
    });
    Goal.belongsTo(models.User, {
      foreignKey: 'assignedByTutorId',
      as: 'assignedBy',
      constraints: false,
    });
  };

  return Goal;
};