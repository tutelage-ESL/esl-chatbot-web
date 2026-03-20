'use strict';
const service = require('./conversation.service');
const apiResponse = require('../../../utils/ApiResponse');
async function sendMessage(req, res) {
  try {
    const { message, sessionId } = req.body;
    const result = await service.sendMessage({ userId: req.userId, message, sessionId });
    return apiResponse.success(res, result);
  } catch (err) {
    return apiResponse.internalError(res);
  }
}
async function getHistory(req, res) {
  try {
    const sessions = await service.getHistory(req.userId);
    return apiResponse.success(res, { sessions });
  } catch (err) {
    return apiResponse.internalError(res);
  }
}
module.exports = { sendMessage, getHistory };
