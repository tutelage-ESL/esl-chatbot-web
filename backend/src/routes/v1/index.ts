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
import subscriptionsRouter from "../../modules/subscriptions/subscriptions.router.ts";
import dashboardRouter from "../../modules/dashboard/dashboard.router.ts";
import devRouter from "./dev.router.ts";
import { env } from "../../config/env.ts";

const router = Router();

// Dev test pages — must be mounted before any route that uses dynamic :id segments
if (env.NODE_ENV !== "production") {
  router.use("/dev", devRouter);
}

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
router.use("/subscriptions", subscriptionsRouter);
router.use("/dashboard", dashboardRouter);

export default router;
