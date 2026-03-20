'use strict';
const service = require('./analytics.service');
const apiResponse = require('../../../utils/ApiResponse');
async function getProgress(req, res) {
  try { const data = await service.getProgressHistory(req.userId, req.query); return apiResponse.success(res, { progress: data }); }
  catch (err) { return apiResponse.internalError(res); }
}
module.exports = { getProgress };
