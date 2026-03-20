'use strict';
const service = require('./admin.service');
const apiResponse = require('../../../utils/ApiResponse');
async function getTutors(req, res) {
  try { const tutors = await service.getAllTutors(req.userId); return apiResponse.success(res, { tutors }); }
  catch (err) { return apiResponse.internalError(res); }
}
async function createTutor(req, res) {
  try { const tutor = await service.registerTutor(req.userId, req.body); return apiResponse.created(res, { tutor }, 'Tutor registered'); }
  catch (err) { if (err.statusCode === 409) return apiResponse.conflict(res, err.message); return apiResponse.internalError(res); }
}
async function getOverview(req, res) {
  try { const data = await service.getOverview(); return apiResponse.success(res, data); }
  catch (err) { return apiResponse.internalError(res); }
}
module.exports = { getTutors, createTutor, getOverview };
