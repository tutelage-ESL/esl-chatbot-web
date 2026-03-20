'use strict';
const name = 'evaluatePronunciation';
async function process(job) {
  const { pronunciationAttemptId } = job.data;
  // TODO: call AI pronunciation evaluation service
  console.log(`[Job:${name}] Processing attempt ${pronunciationAttemptId}`);
}
module.exports = { name, process };
