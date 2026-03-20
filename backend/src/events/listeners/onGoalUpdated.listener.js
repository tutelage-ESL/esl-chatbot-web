'use strict';
module.exports = function register(emitter) {
  emitter.on('goal:updated', async (payload) => {
    const { goalId, userId } = payload;
    // TODO: check goal completion, notify tutor if assigned
    console.log(`[Event:GoalUpdated] goal=${goalId} user=${userId}`);
  });
};
