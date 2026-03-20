'use strict';
const service = require('./pronunciation.service');
const apiResponse = require('../../../utils/ApiResponse');
async function analyze(req, res) {
  try {
    const result = await service.analyze({ userId: req.userId, ...req.body });
    return apiResponse.success(res, result);
  } catch (err) { return apiResponse.internalError(res); }
}
module.exports = { analyze };
