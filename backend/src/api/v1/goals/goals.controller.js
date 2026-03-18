'use strict';

const db = require('../../../../models');
const { Goal, Vocabulary, Interaction } = db;
const apiResponse = require('../../../../utils/apiResponse');
const { updateProgressDB } = require('../chat/chat.controller');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateMilestones(target, labelFn) {
  return [0.25, 0.5, 0.75, 1.0].map((frac, i) => ({
    id: i + 1,
    title: labelFn(Math.round(target * frac)),
    description: labelFn(Math.round(target * frac)),
    targetProgress: frac * 100,
    completed: false
  }));
}

async function enhanceGoalData(type, target, timeframe, description) {
  const tmpl = {
    vocabulary: {
      description: `Learn ${target} new vocabulary words`,
      difficulty: target <= 50 ? 'beginner' : target <= 150 ? 'intermediate' : 'advanced',
      category: 'vocabulary',
      milestones: generateMilestones(target, n => `${n} words learned`),
      actionPlan: ['Add 3-5 new words daily', 'Practice with flashcards for 15 minutes', 'Use new words in sentences', 'Review and quiz yourself weekly']
    },
    pronunciation: {
      description: `Practice pronunciation for ${target} words`,
      difficulty: target <= 30 ? 'beginner' : target <= 100 ? 'intermediate' : 'advanced',
      category: 'pronunciation',
      milestones: generateMilestones(target, n => `${n} words practiced`),
      actionPlan: ['Practice pronunciation daily for 10-15 minutes', 'Record yourself', 'Focus on difficult sounds', 'Use pronunciation tools']
    },
    conversation: {
      description: `Have ${target} meaningful conversations`,
      difficulty: target <= 10 ? 'beginner' : target <= 30 ? 'intermediate' : 'advanced',
      category: 'speaking',
      milestones: generateMilestones(target, n => `${n} conversations completed`),
      actionPlan: ['Engage in daily conversation practice', 'Join language exchange', 'Practice with AI chatbot', 'Focus on fluency']
    }
  };
  const template = tmpl[type] || tmpl.vocabulary;
  const targetDate = new Date();
  if (timeframe === 'week') targetDate.setDate(targetDate.getDate() + 7);
  else if (timeframe === 'quarter') targetDate.setMonth(targetDate.getMonth() + 3);
  else targetDate.setMonth(targetDate.getMonth() + 1);
  return { ...template, description: description || template.description, targetDate };
}

async function calculateGoalStats(userId) {
  try {
    const total = await Goal.count({ where: { userId } });
    const active = await Goal.count({ where: { userId, status: 'active' } });
    const completed = await Goal.count({ where: { userId, status: 'completed' } });
    const avgProgress = await Goal.findAll({
      where: { userId, status: 'active' },
      attributes: [[db.sequelize.fn('AVG', db.sequelize.col('progress')), 'avgProgress']]
    });
    const bestStreak = await Goal.findAll({
      where: { userId },
      attributes: [[db.sequelize.fn('MAX', db.sequelize.col('bestStreak')), 'maxStreak']]
    });
    return {
      total, active, completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      averageProgress: Math.round(avgProgress[0]?.dataValues.avgProgress || 0),
      bestStreak: parseInt(bestStreak[0]?.dataValues.maxStreak || 0)
    };
  } catch (error) {
    console.error('Error calculating goal stats:', error);
    return { total: 0, active: 0, completed: 0, completionRate: 0, averageProgress: 0, bestStreak: 0 };
  }
}

function calculateProgressIncrement(goalType, value) {
  if (goalType === 'vocabulary') return value * 2;
  if (goalType === 'pronunciation') return value * 3;
  if (goalType === 'conversation') return value * 10;
  return value;
}

function checkMilestoneCompletion(goal, newProgress) {
  if (!goal.milestones) return goal.completedMilestones || 0;
  return goal.milestones.filter(m => newProgress >= m.targetProgress).length;
}

function calculateUserLevel(vocabCount, interactionCount) {
  const total = vocabCount + (interactionCount / 10);
  if (total < 20) return 'beginner';
  if (total < 100) return 'intermediate';
  return 'advanced';
}

function generateGoalSuggestions(userStats) {
  const suggestions = [];
  if (userStats.vocabularyWords < 50) {
    suggestions.push({ type: 'vocabulary', title: 'Build Your Vocabulary Foundation', description: 'Learn 50 essential English words', target: 50, timeframe: 'month', difficulty: 'beginner', reason: 'Building a strong vocabulary foundation is essential for language learning' });
  } else if (userStats.vocabularyWords < 200) {
    suggestions.push({ type: 'vocabulary', title: 'Expand Your Vocabulary', description: 'Learn 100 intermediate vocabulary words', target: 100, timeframe: 'quarter', difficulty: 'intermediate', reason: 'Expanding your vocabulary will improve your communication skills' });
  }
  suggestions.push({ type: 'pronunciation', title: 'Perfect Your Pronunciation', description: 'Practice pronunciation of 30 challenging words', target: 30, timeframe: 'month', difficulty: userStats.level, reason: 'Clear pronunciation builds confidence in speaking' });
  if (userStats.totalInteractions < 50) {
    suggestions.push({ type: 'conversation', title: 'Start Conversing', description: 'Have 10 meaningful conversations', target: 10, timeframe: 'month', difficulty: 'beginner', reason: 'Regular conversation practice improves fluency and confidence' });
  }
  return suggestions;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

exports.createGoal = async (req, res) => {
  try {
    const { type, target, timeframe, description, difficulty, category } = req.body;
    const userId = req.userId;
    if (!type || !target || !timeframe) return apiResponse.validationError(res, 'Type, target, and timeframe are required');
    const goalData = await enhanceGoalData(type, target, timeframe, description);
    const goal = await Goal.create({
      userId, type, target: parseInt(target), timeframe, description: description || goalData.description,
      difficulty: difficulty || goalData.difficulty, category: category || goalData.category,
      milestones: goalData.milestones, actionPlan: goalData.actionPlan, progress: 0, status: 'active',
      startDate: new Date(), targetDate: goalData.targetDate, currentStreak: 0, bestStreak: 0, completedMilestones: 0
    });
    await updateProgressDB(userId, `${type} goal`, 'goal', `Set new goal: ${description || goalData.description}`);
    return apiResponse.created(res, { goal }, 'Goal created successfully');
  } catch (error) {
    console.error('Error setting goal:', error);
    return apiResponse.internalError(res, 'Failed to set goal');
  }
};

exports.getGoals = async (req, res) => {
  try {
    const userId = req.userId;
    const { status = 'all', type = 'all' } = req.query;
    let whereClause = { userId };
    if (status !== 'all') whereClause.status = status;
    if (type !== 'all') whereClause.type = type;
    const goals = await Goal.findAll({ where: whereClause, order: [['createdAt', 'DESC']] });
    const stats = await calculateGoalStats(userId);
    return apiResponse.success(res, { goals, stats });
  } catch (error) {
    console.error('Error fetching goals:', error);
    return apiResponse.internalError(res, 'Failed to fetch goals');
  }
};

exports.updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, target, timeframe, status } = req.body;
    const userId = req.userId;
    const goal = await Goal.findOne({ where: { id, userId } });
    if (!goal) return apiResponse.notFound(res, 'Goal not found');
    const updateData = {};
    if (description) updateData.description = description;
    if (target) updateData.target = parseInt(target);
    if (timeframe) updateData.timeframe = timeframe;
    if (status) { updateData.status = status; if (status === 'completed') { updateData.completedDate = new Date(); updateData.progress = 100; } }
    await goal.update(updateData);
    return apiResponse.success(res, { goal });
  } catch (error) {
    console.error('Error updating goal:', error);
    return apiResponse.internalError(res, 'Failed to update goal');
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const goal = await Goal.findOne({ where: { id, userId } });
    if (!goal) return apiResponse.notFound(res, 'Goal not found');
    await goal.destroy();
    return apiResponse.success(res, null, 'Goal deleted successfully');
  } catch (error) {
    console.error('Error deleting goal:', error);
    return apiResponse.internalError(res, 'Failed to delete goal');
  }
};

exports.recordProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { activity, value, notes } = req.body;
    const userId = req.userId;
    const goal = await Goal.findOne({ where: { id, userId } });
    if (!goal) return apiResponse.notFound(res, 'Goal not found');
    if (goal.status !== 'active') return apiResponse.validationError(res, 'Cannot update progress for inactive goal');
    const progressIncrement = calculateProgressIncrement(goal.type, value || 1);
    const newProgress = Math.min(100, goal.progress + progressIncrement);
    const today = new Date().toDateString();
    const lastUpdate = goal.lastProgressUpdate ? new Date(goal.lastProgressUpdate).toDateString() : null;
    const newStreak = lastUpdate !== today ? goal.currentStreak + 1 : goal.currentStreak;
    const newBestStreak = Math.max(goal.bestStreak, newStreak);
    const completedMilestones = checkMilestoneCompletion(goal, newProgress);
    await goal.update({
      progress: newProgress, currentStreak: newStreak, bestStreak: newBestStreak,
      completedMilestones, lastProgressUpdate: new Date(),
      status: newProgress >= 100 ? 'completed' : 'active',
      completedDate: newProgress >= 100 ? new Date() : null
    });
    await Interaction.create({
      userId, type: 'goal_progress', message: `${goal.type} goal progress`,
      responsePreview: `${activity}: +${progressIncrement}% progress (${newProgress}% total)`, duration: 0, score: progressIncrement
    });
    await updateProgressDB(userId, activity, 'goal', `Goal progress: ${newProgress}%`);
    return apiResponse.success(res, {
      progress: newProgress, streak: newStreak,
      milestoneCompleted: completedMilestones > goal.completedMilestones,
      goalCompleted: newProgress >= 100
    });
  } catch (error) {
    console.error('Error recording goal progress:', error);
    return apiResponse.internalError(res, 'Failed to record progress');
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const userId = req.userId;
    const vocabCount = await Vocabulary.count({ where: { userId } });
    const interactionCount = await Interaction.count({ where: { userId } });
    const goalCount = await Goal.count({ where: { userId } });
    const userStats = {
      vocabularyWords: vocabCount, totalInteractions: interactionCount, goalsSet: goalCount,
      level: calculateUserLevel(vocabCount, interactionCount)
    };
    const suggestions = generateGoalSuggestions(userStats);
    return apiResponse.success(res, { suggestions });
  } catch (error) {
    console.error('Error generating goal suggestions:', error);
    return apiResponse.internalError(res, 'Failed to generate suggestions');
  }
};
