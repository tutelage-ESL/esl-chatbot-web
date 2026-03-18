'use strict';

const db = require('../../../../models');
const { Interaction, UserMetrics } = db;
const apiResponse = require('../../../../utils/apiResponse');

exports.getProgress = async (req, res) => {
  try {
    const userId = req.userId;
    const progress = await db.Progress.findOne({ where: { userId } }) || {
      progress: 0, chatMessageCount: 0, totalWordsTyped: 0, lastActiveDate: new Date()
    };
    const interactions = await Interaction.findAll({ where: { userId }, order: [['timestamp', 'DESC']], limit: 50 });
    const metrics = await UserMetrics.findOne({ where: { userId } });
    const studyTimeMinutes = metrics?.totalStudyTimeMinutes || 0;
    const studyTime = `${Math.floor(studyTimeMinutes / 60)}h ${studyTimeMinutes % 60}m`;

    return apiResponse.success(res, {
      progress: progress.progress || 0,
      chatMessageCount: progress.chatMessageCount || 0,
      totalWordsTyped: progress.totalWordsTyped || 0,
      studyTime,
      dayStreak: 0,
      level: 'Intermediate',
      activities: interactions.slice(0, 10).map(i => ({
        type: i.type || 'chat',
        message: i.message || 'Chat interaction',
        timestamp: i.timestamp,
        score: i.score || 0
      }))
    });
  } catch (error) {
    console.error('Progress fetch error:', error);
    return apiResponse.internalError(res, 'Failed to fetch progress');
  }
};
