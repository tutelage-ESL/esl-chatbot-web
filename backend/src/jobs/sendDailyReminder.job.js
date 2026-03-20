'use strict';
const name = 'sendDailyReminder';
async function process(job) {
  const { userId } = job.data;
  // TODO: send study reminder via email/push
  console.log(`[Job:${name}] Sending reminder to user ${userId}`);
}
module.exports = { name, process };
