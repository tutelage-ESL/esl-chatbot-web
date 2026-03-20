'use strict';
// Job queue stub — integrate with BullMQ/Bull when needed
const queues = {};
function addJob(queueName, data, opts = {}) {
  if (!queues[queueName]) queues[queueName] = [];
  queues[queueName].push({ data, opts, addedAt: new Date() });
  console.log(`[Queue stub] Job added to '${queueName}':`, data);
  return Promise.resolve({ id: Date.now() });
}
module.exports = { addJob };
