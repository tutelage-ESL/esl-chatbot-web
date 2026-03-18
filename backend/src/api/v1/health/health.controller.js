'use strict';

const db = require('../../../../models');
const apiResponse = require('../../../../utils/apiResponse');
const elevenLabsService = require('../../../../services/elevenLabsService');

exports.health = async (req, res) => {
  try {
    let databaseOk = false;
    try { await db.sequelize.authenticate(); databaseOk = true; } catch (dbErr) {
      console.error('Database health check failed:', dbErr.message);
    }
    const memUsage = process.memoryUsage();
    const fmt = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';
    return apiResponse.success(res, {
      status: databaseOk ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()) + ' seconds',
      services: { database: databaseOk, gemini: !!global.genAI, elevenlabs: elevenLabsService.isAvailable() },
      memory: { heapUsed: fmt(memUsage.heapUsed), heapTotal: fmt(memUsage.heapTotal), rss: fmt(memUsage.rss) }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return apiResponse.success(res, { status: 'ERROR', timestamp: new Date().toISOString(), error: error.message });
  }
};
