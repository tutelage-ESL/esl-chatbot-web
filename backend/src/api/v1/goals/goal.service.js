'use strict';
const goalRepo = require('./goal.repository');
const ApiError = require('../../../utils/ApiError');
async function list(userId) { return goalRepo.findByUser(userId); }
async function create(userId, data) { return goalRepo.create({ userId, ...data, status: 'active', progress: 0, startDate: new Date() }); }
async function update(id, userId, data) {
  const goal = await goalRepo.findById(id);
  if (!goal || goal.userId !== userId) throw ApiError.notFound('Goal not found');
  return goalRepo.update(id, data);
}
async function remove(id, userId) {
  const goal = await goalRepo.findById(id);
  if (!goal || goal.userId !== userId) throw ApiError.notFound('Goal not found');
  return goalRepo.remove(id);
}
module.exports = { list, create, update, remove };
