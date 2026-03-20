'use strict';
const db = require('../../../models');
/**
 * @swagger
 * /api/v2/status:
 *   get:
 *     tags: [Status]
 *     summary: Service status
 *     description: Returns detailed status of all backend services
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse'
 */
async function getStatus(req, res) {
  let dbOk = false;
  try { await db.sequelize.authenticate(); dbOk = true; } catch {}
  res.json({
    status: 'ok',
    services: {
      database: dbOk,
      ai: !!process.env.GEMINI_API_KEY,
      tts: !!process.env.ELEVENLABS_API_KEY
    }
  });
}
/**
 * @swagger
 * /api/v2/ping:
 *   get:
 *     tags: [Status]
 *     summary: Ping
 *     description: Simple liveness probe
 *     responses:
 *       200:
 *         description: Pong
 */
function ping(req, res) { res.json({ message: 'pong', timestamp: new Date().toISOString() }); }
module.exports = { getStatus, ping };
