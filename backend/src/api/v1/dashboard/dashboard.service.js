'use strict';
const db = require('../../../models');
async function getStats(userId) {
  const [metrics, recentProgress] = await Promise.all([
    db.UserMetrics.findOne({ where: { userId } }),
    db.Progress.findAll({ where: { userId }, order: [['date', 'DESC']], limit: 7 })
  ]);
  return { metrics: metrics || {}, recentProgress };
}
module.exports = { getStats };
