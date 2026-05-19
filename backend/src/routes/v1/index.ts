import { Router } from "express";
import usersRouter from "../../modules/users/users.router.ts";
import authRouter from "../../modules/auth/auth.router.ts";
import classesRouter from "../../modules/classes/classes.router.ts";
import sessionsRouter from "../../modules/sessions/sessions.router.ts";
import messagesRouter from "../../modules/messages/messages.router.ts";
import aiRouter from "../../modules/ai/ai.router.ts";
import adminRouter from "../../modules/admin/admin.router.ts";
import goalsRouter from "../../modules/goals/goals.router.ts";
import vocabularyRouter from "../../modules/vocabulary/vocabulary.router.ts";
import progressRouter from "../../modules/progress/progress.router.ts";
import metricsRouter from "../../modules/metrics/metrics.router.ts";
import announcementsRouter from "../../modules/announcements/announcements.router.ts";
import notificationsRouter from "../../modules/notifications/notifications.router.ts";

const router = Router();

router.use("/auth", authRouter);
router.use("/ai", aiRouter);
router.use("/users", usersRouter);
router.use("/users", notificationsRouter);
router.use("/classes", classesRouter);
router.use("/classes/:id/announcements", announcementsRouter);
router.use("/sessions", sessionsRouter);
router.use("/sessions", messagesRouter);
router.use("/admin", adminRouter);
router.use("/goals", goalsRouter);
router.use("/vocabulary", vocabularyRouter);
router.use("/progress", progressRouter);
router.use("/metrics", metricsRouter);

// Routers to be mounted in upcoming phases:
// router.use("/subscriptions", subscriptionsRouter);

export default router;
