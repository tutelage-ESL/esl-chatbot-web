'use strict';
const service = require('./learnerProfile.service');
const apiResponse = require('../../../utils/ApiResponse');
async function getProfile(req, res) {
  try {
    const profile = await service.getProfile(req.userId);
    return apiResponse.success(res, { profile });
  } catch (err) {
    if (err.statusCode === 404) return apiResponse.notFound(res, err.message);
    return apiResponse.internalError(res);
  }
}
async function updateProfile(req, res) {
  try {
    const profile = await service.upsertProfile(req.userId, req.body);
    return apiResponse.success(res, { profile }, 'Profile updated');
  } catch (err) {
    return apiResponse.internalError(res);
  }
}
module.exports = { getProfile, updateProfile };
