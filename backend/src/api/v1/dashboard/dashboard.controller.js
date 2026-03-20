'use strict';
const service = require('./dashboard.service');
const apiResponse = require('../../../utils/ApiResponse');
async function getStats(req, res) {
  try { const data = await service.getStats(req.userId); return apiResponse.success(res, data); }
  catch (err) { return apiResponse.internalError(res); }
}
module.exports = { getStats };
