'use strict';
/**
 * @swagger
 * /api/v2/health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     description: Returns server health status, version, and uptime
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
function check(req, res) {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString(), uptime: process.uptime() });
}
module.exports = { check };
