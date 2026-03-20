'use strict';
const service = require('./vocabulary.service');
const apiResponse = require('../../../utils/ApiResponse');
async function list(req, res) {
  try { const data = await service.list(req.userId); return apiResponse.success(res, data); }
  catch (err) { return apiResponse.internalError(res); }
}
async function add(req, res) {
  try { const item = await service.add(req.userId, req.body); return apiResponse.created(res, { item }); }
  catch (err) { return apiResponse.internalError(res); }
}
async function update(req, res) {
  try { const item = await service.update(req.params.id, req.userId, req.body); return apiResponse.success(res, { item }); }
  catch (err) { if (err.statusCode === 404) return apiResponse.notFound(res, err.message); return apiResponse.internalError(res); }
}
async function remove(req, res) {
  try { await service.remove(req.params.id, req.userId); return apiResponse.success(res, null, 'Deleted'); }
  catch (err) { if (err.statusCode === 404) return apiResponse.notFound(res, err.message); return apiResponse.internalError(res); }
}
async function getDueCards(req, res) {
  try { const cards = await service.getDueCards(req.userId); return apiResponse.success(res, { cards }); }
  catch (err) { return apiResponse.internalError(res); }
}
async function recordPractice(req, res) {
  try { const item = await service.recordPractice(req.params.id, req.userId, req.body.quality); return apiResponse.success(res, { item }); }
  catch (err) { if (err.statusCode === 404) return apiResponse.notFound(res, err.message); return apiResponse.internalError(res); }
}
module.exports = { list, add, update, remove, getDueCards, recordPractice };
