'use strict';
// Job registry — register and initialize all background jobs here
const jobs = [
  require('./evaluatePronunciation.job'),
  require('./evaluateMessage.job'),
  require('./updateUserMetrics.job'),
  require('./writeProgressSnapshot.job'),
  require('./sendDailyReminder.job'),
];
function initJobs() {
  console.log(`[Jobs] ${jobs.length} jobs registered (queue integration pending)`);
}
module.exports = { initJobs };
