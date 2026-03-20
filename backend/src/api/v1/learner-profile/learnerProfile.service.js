'use strict';
const db = require('../../../models');
const ApiError = require('../../../utils/ApiError');

async function getProfile(userId) {
  const profile = await db.LearnerProfile.findOne({ where: { userId } });
  if (!profile) throw ApiError.notFound('Learner profile not found');
  return profile;
}
async function upsertProfile(userId, data) {
  const [profile] = await db.LearnerProfile.findOrCreate({ where: { userId }, defaults: { userId, ...data } });
  if (!profile.isNewRecord) await profile.update(data);
  return profile.reload();
}
module.exports = { getProfile, upsertProfile };
