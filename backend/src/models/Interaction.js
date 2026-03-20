'use strict';

/**
 * models/Interaction.js — DEPRECATED
 *
 * This model has been replaced by the combination of:
 *   - ConversationSession  (groups messages, carries session-level metadata)
 *   - Message              (individual turns; holds aiEvaluation inline)
 *   - Progress             (daily snapshot for activity counters & scores)
 *
 * This file is kept as a tombstone to prevent accidental re-creation.
 * Do NOT import or register this model in models/index.js.
 */

// eslint-disable-next-line no-unused-vars
module.exports = () => {
  throw new Error(
    '[Interaction] This model is deprecated. ' +
    'Use ConversationSession + Message + Progress instead.'
  );
};
