'use strict';

/**
 * models/ConversationSession.js
 *
 * Groups a set of messages into a single session so the AI has proper context.
 * One session = one continuous chat or voice/pronunciation interaction.
 *
 * Lifecycle:
 *   1. Created when the student opens a new chat.
 *   2. Messages are attached via Message.sessionId.
 *   3. Closed (endedAt set) when the student leaves or after inactivity.
 *   4. The AI generates a `summary` at close time for long-term memory.
 */
module.exports = (sequelize, DataTypes) => {
  const ConversationSession = sequelize.define('ConversationSession', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // ── Session type ──────────────────────────────────────────
    mode: {
      type: DataTypes.ENUM('text', 'voice', 'lesson', 'pronunciation'),
      allowNull: false,
      defaultValue: 'text',
      comment: 'Primary interaction mode for this session.',
    },

    // ── Topic & AI memory ─────────────────────────────────────
    topic: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'AI-detected or user-selected conversation topic.',
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'AI-generated summary written at session close; used for long-term context.',
    },
    aiContextSnapshot: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Snapshot of key learner state the AI needs across sessions.',
    },

    // ── Timing ────────────────────────────────────────────────
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Null while the session is active.',
    },
    durationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Computed and stored when the session is closed.',
    },

    // ── Aggregate stats (filled at close time) ────────────────
    messageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    averageScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Average pronunciation or quiz score for the session (0-100).',
    },
  }, {
    tableName: 'conversation_sessions',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'startedAt'] },
      { fields: ['mode'] },
    ],
  });

  ConversationSession.associate = function (models) {
    ConversationSession.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false,
    });
    ConversationSession.hasMany(models.Message, {
      foreignKey: 'sessionId',
      as: 'messages',
      constraints: false,
    });
  };

  return ConversationSession;
};
