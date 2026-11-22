import { Router } from "express";
import { getPublicStatsHandler } from "./public.controller.ts";

const router = Router();

/**
 * @swagger
 * /public/stats:
 *   get:
 *     summary: Public numbers for the marketing site (no auth)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Public stats retrieved }
 *                 data:
 *                   type: object
 *                   required: [learners]
 *                   properties:
 *                     learners:
 *                       type: integer
 *                       description: Active student accounts
 *                       example: 2140
 */
router.get("/stats", getPublicStatsHandler);

export default router;
