'use strict';

const db = require('../../../../models');

exports.getStatus = async (req, res) => {
  try {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'User not authenticated' });
    const user = await db.User.findByPk(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.shouldResetUsage()) await user.resetMonthlyUsage();
    const tierLimits = user.getTierLimits();
    const remainingUsage = user.getRemainingUsage();
    const usagePercentage = (user.monthlyTtsUsage / tierLimits) * 100;
    res.json({
      subscriptionTier: user.subscriptionTier, monthlyLimit: tierLimits,
      monthlyUsage: user.monthlyTtsUsage, remainingUsage,
      usagePercentage: Math.round(usagePercentage), lastReset: user.lastUsageReset,
      warningThreshold: tierLimits * 0.8, nearLimit: usagePercentage >= 80
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
};

exports.updateTier = async (req, res) => {
  try {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'User not authenticated' });
    const { tier } = req.body;
    const validTiers = ['standard', 'gold', 'diamond'];
    const normalizedTier = (tier || '').toLowerCase();
    if (!normalizedTier || !validTiers.includes(normalizedTier)) {
      return res.status(400).json({ error: 'Invalid tier', validTiers: ['Standard', 'Gold', 'Diamond'] });
    }
    const user = await db.User.findByPk(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const oldTier = user.subscriptionTier;
    const limitsMap = { standard: 20 * 60, gold: 60 * 60, diamond: 120 * 60 };
    const oldLimit = limitsMap[oldTier] || limitsMap.standard;
    user.subscriptionTier = normalizedTier;
    await user.save();
    console.log(`User ${user.id} tier changed from ${oldTier} to ${normalizedTier}`);
    const newLimit = user.getTierLimits();
    res.json({
      message: 'Subscription tier updated successfully', subscriptionTier: user.subscriptionTier,
      monthlyLimit: newLimit, remainingUsage: user.getRemainingUsage(), upgraded: newLimit > oldLimit
    });
  } catch (error) {
    console.error('Error updating subscription tier:', error);
    res.status(500).json({ error: 'Failed to update subscription tier' });
  }
};

exports.getUsageHistory = async (req, res) => {
  try {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'User not authenticated' });
    const user = await db.User.findByPk(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const tierLimits = user.getTierLimits();
    const usagePercentage = (user.monthlyTtsUsage / tierLimits) * 100;
    res.json({
      currentMonth: { usage: user.monthlyTtsUsage, limit: tierLimits, percentage: Math.round(usagePercentage), tier: user.subscriptionTier },
      resetDate: user.lastUsageReset,
      nextResetDate: new Date(user.lastUsageReset.getFullYear(), user.lastUsageReset.getMonth() + 1, 1)
    });
  } catch (error) {
    console.error('Error fetching usage history:', error);
    res.status(500).json({ error: 'Failed to fetch usage history' });
  }
};

exports.resetUsage = async (req, res) => {
  try {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'User not authenticated' });
    const user = await db.User.findByPk(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.resetMonthlyUsage();
    res.json({ message: 'Monthly usage reset successfully', monthlyUsage: user.monthlyTtsUsage, lastReset: user.lastUsageReset });
  } catch (error) {
    console.error('Error resetting usage:', error);
    res.status(500).json({ error: 'Failed to reset usage' });
  }
};
