'use strict';
const service = require('./subscription.service');
const apiResponse = require('../../../utils/ApiResponse');
async function getStatus(req, res) {
  try {
    const data = await service.getStatus(req.userId);
    return apiResponse.success(res, data);
  } catch (err) {
    if (err.statusCode === 404) return apiResponse.notFound(res, err.message);
    return apiResponse.internalError(res);
  }
}
async function changePlan(req, res) {
  try {
    const sub = await service.changePlan(req.userId, req.body.plan);
    return apiResponse.success(res, { subscription: sub }, 'Plan updated');
  } catch (err) {
    if (err.statusCode === 400) return apiResponse.error(res, 'BAD_REQUEST', err.message, 400);
    return apiResponse.internalError(res);
  }
}
module.exports = { getStatus, changePlan };
