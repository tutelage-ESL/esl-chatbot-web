'use strict';
const name = 'evaluateMessage';
async function process(job) {
  const { messageId } = job.data;
  // TODO: call AI grammar/feedback evaluation service
  console.log(`[Job:${name}] Processing message ${messageId}`);
}
module.exports = { name, process };
