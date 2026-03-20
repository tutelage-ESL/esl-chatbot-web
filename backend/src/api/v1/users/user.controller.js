'use strict';
const userService = require('./user.service');
const apiResponse = require('../../../utils/ApiResponse');

async function getMyStudents(req, res) {
  try {
    const result = await userService.getStudentsByTutor(req.userId);
    return apiResponse.success(res, result);
  } catch (err) {
    return apiResponse.internalError(res, err.message);
  }
}
async function getMyProfile(req, res) {
  try {
    const user = await userService.getUserProfile(req.userId);
    return apiResponse.success(res, { user });
  } catch (err) {
    if (err.statusCode === 404) return apiResponse.notFound(res, err.message);
    return apiResponse.internalError(res, err.message);
  }
}
async function updateMyProfile(req, res) {
  try {
    const user = await userService.updateUser(req.userId, req.body);
    return apiResponse.success(res, { user }, 'Profile updated successfully');
  } catch (err) {
    if (err.statusCode === 404) return apiResponse.notFound(res, err.message);
    return apiResponse.internalError(res, err.message);
  }
}

module.exports = { getMyStudents, getMyProfile, updateMyProfile };
