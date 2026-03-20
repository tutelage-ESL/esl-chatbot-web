'use strict';
const name = 'writeProgressSnapshot';
async function process(job) {
  const { userId, date } = job.data;
  // TODO: upsert daily Progress row for userId + date
  console.log(`[Job:${name}] Writing snapshot for user ${userId} on ${date}`);
}
module.exports = { name, process };
