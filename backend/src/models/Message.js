'use strict';

/**
 * models/Message.js
 *
 * A single turn in a conversation (user input or AI response).
 * Always belongs to a ConversationSession and a User.
 *
 * AI evaluation data (grammar corrections, pronunciation scores, suggestions)
 * is stored inline as `aiEvaluation` JSON so it stays with the message
 * without requiring a separate table.
 */
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK → conversation_sessions(id). Groups this message into a session.',
    },

    // ── Content ───────────────────────────────────────────────
    role: {
      type: DataTypes.ENUM('user', 'assistant'),
      allowNull: false,
      comment: '"user" = student input; "assistant" = AI response.',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    inputMode: {
      type: DataTypes.ENUM('text', 'voice'),
      allowNull: false,
      defaultValue: 'text',
      comment: 'How the user submitted this message (text typed vs voice recorded).',
    },
    wordCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },

    // ── AI feedback ───────────────────────────────────────────
    /**
     * aiEvaluation — optional JSON attached to AI response messages.
     * Suggested shape:
     * {
     *   grammarScore:       number (0-100),
     *   pronunciationScore: number (0-100),
     *   corrections:        [{ original, corrected, explanation }],
     *   suggestions:        string[],
     *   fluencyNote:        string
     * }
     */
    aiEvaluation: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Inline AI feedback: grammar score, corrections, pronunciation score, suggestions.',
    },
  }, {
    tableName: 'messages',
    timestamps: true,
    indexes: [
      { fields: ['sessionId', 'createdAt'] },
      { fields: ['userId', 'createdAt'] },
    ],
  });

  Message.associate = function (models) {
    Message.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false,
    });
    Message.belongsTo(models.ConversationSession, {
      foreignKey: 'sessionId',
      as: 'session',
      constraints: false,
    });
  };

  return Message;
};
