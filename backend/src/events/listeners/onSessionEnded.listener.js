'use strict';
const SESSION_EVENTS = require('../session.events');
module.exports = function register(emitter) {
  emitter.on(SESSION_EVENTS.SESSION_ENDED, async (payload) => {
    const { sessionId, userId } = payload;
    // TODO: trigger writeProgressSnapshot job, update UserMetrics
    console.log(`[Event:SessionEnded] session=${sessionId} user=${userId}`);
  });
};
