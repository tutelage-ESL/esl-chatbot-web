'use strict';
const PLANS = { FREE: 'free', BASIC: 'basic', PRO: 'pro' };
const TTS_LIMITS = { free: 20 * 60, basic: 60 * 60, pro: 120 * 60 };
module.exports = { PLANS, TTS_LIMITS };
