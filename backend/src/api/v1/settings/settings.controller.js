'use strict';

const db = require('../../../../models');
const apiResponse = require('../../../../utils/apiResponse');

exports.getSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = await db.Settings.findOne({ where: { userId } });
    if (!settings) return apiResponse.notFound(res, 'Settings not found');
    return apiResponse.success(res, settings);
  } catch (error) {
    console.error('Settings fetch error:', error);
    return apiResponse.internalError(res, 'Failed to fetch settings');
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { user_id, language, voiceSpeed, autoSpeak } = req.body;
    if (!user_id) return apiResponse.validationError(res, 'user_id is required');
    const [updatedSettings] = await db.Settings.upsert({ userId: user_id, language, voiceSpeed, autoSpeak });
    return apiResponse.success(res, updatedSettings);
  } catch (error) {
    console.error('Settings update error:', error);
    return apiResponse.internalError(res, 'Failed to update settings');
  }
};

exports.uploadFile = (req, res) => {
  try {
    if (!req.file) return apiResponse.validationError(res, 'No file uploaded');
    return apiResponse.success(res, { filename: req.file.filename, originalName: req.file.originalname });
  } catch (error) {
    console.error('Upload error:', error);
    return apiResponse.internalError(res, 'Failed to upload file');
  }
};
