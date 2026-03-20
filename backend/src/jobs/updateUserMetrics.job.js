'use strict';
const name = 'updateUserMetrics';
async function process(job) {
  const { userId } = job.data;
  // TODO: recalculate and persist UserMetrics for userId
  console.log(`[Job:${name}] Updating metrics for user ${userId}`);
}
module.exports = { name, process };
