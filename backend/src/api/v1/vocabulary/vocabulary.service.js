'use strict';
const vocabRepo = require('./vocabulary.repository');
const { sm2, getNextDueDate } = require('../../../utils/sm2');
const ApiError = require('../../../utils/ApiError');

async function list(userId, query = {}) { return vocabRepo.findByUser(userId, query); }
async function add(userId, data) { return vocabRepo.create({ userId, ...data, srsDue: new Date(), srsInterval: 1, srsEase: 2.5 }); }
async function update(id, userId, data) {
  const item = await vocabRepo.findById(id);
  if (!item || item.userId !== userId) throw ApiError.notFound('Vocabulary item not found');
  await vocabRepo.update(id, data);
  return vocabRepo.findById(id);
}
async function remove(id, userId) {
  const item = await vocabRepo.findById(id);
  if (!item || item.userId !== userId) throw ApiError.notFound('Vocabulary item not found');
  return vocabRepo.remove(id);
}
async function getDueCards(userId) { return vocabRepo.getDueCards(userId); }
async function recordPractice(id, userId, quality) {
  const item = await vocabRepo.findById(id);
  if (!item || item.userId !== userId) throw ApiError.notFound('Vocabulary item not found');
  const { interval, ease, repetitions } = sm2(quality, item.srsInterval, item.srsEase, item.reviewCount || 0);
  await vocabRepo.update(id, { srsInterval: interval, srsEase: ease, srsDue: getNextDueDate(interval), reviewCount: (item.reviewCount || 0) + 1, lastPracticed: new Date() });
  return vocabRepo.findById(id);
}
module.exports = { list, add, update, remove, getDueCards, recordPractice };
