'use strict';
const db = require('../../../models');
const ApiError = require('../../../utils/ApiError');
const { PLANS, TTS_LIMITS } = require('../../../constants/plans');

async function getStatus(userId) {
  const sub = await db.Subscription.findOne({ where: { userId } });
  if (!sub) throw ApiError.notFound('No subscription found');
  return { plan: sub.plan, status: sub.status, monthlyTtsUsage: sub.monthlyTtsUsage, ttsLimit: TTS_LIMITS[sub.plan] || TTS_LIMITS[PLANS.FREE] };
}
async function changePlan(userId, plan) {
  if (!Object.values(PLANS).includes(plan)) throw ApiError.badRequest('Invalid plan');
  const [sub] = await db.Subscription.findOrCreate({ where: { userId }, defaults: { userId, plan, status: 'active' } });
  await sub.update({ plan });
  return sub;
}
module.exports = { getStatus, changePlan };
