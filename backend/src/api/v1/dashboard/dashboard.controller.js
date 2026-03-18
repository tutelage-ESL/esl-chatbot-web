'use strict';

const db = require('../../../../models');
const apiResponse = require('../../../../utils/apiResponse');

exports.getStats = async (req, res) => {
  try {
    // Mock stats — replace with real DB queries when analytics are implemented
    const stats = { lessonsCompleted: 12, studyTime: '24h', wordsLearned: 156, streakDays: 7 };
    return apiResponse.success(res, stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return apiResponse.internalError(res, 'Failed to fetch stats');
  }
};

exports.getUsage = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.userId);
    if (!user) return apiResponse.notFound(res, 'User not found');
    const remainingUsage = user.getRemainingUsage();
    const tierLimits = user.getTierLimits();
    const usagePercentage = ((tierLimits.ttsMinutes * 60 - remainingUsage) / (tierLimits.ttsMinutes * 60)) * 100;
    return apiResponse.success(res, { remainingUsage, usagePercentage: Math.round(usagePercentage), tierLimits });
  } catch (error) {
    console.error('Error fetching usage:', error);
    return apiResponse.internalError(res, 'Failed to fetch usage');
  }
};
