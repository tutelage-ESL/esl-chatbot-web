import { Router } from "express";
import usersRouter from "../../modules/users/users.router.ts";
import authRouter from "../../modules/auth/auth.router.ts";
import classesRouter from "../../modules/classes/classes.router.ts";
import sessionsRouter from "../../modules/sessions/sessions.router.ts";
import messagesRouter from "../../modules/messages/messages.router.ts";
import aiRouter from "../../modules/ai/ai.router.ts";

const router = Router();

router.use("/auth", authRouter);
router.use("/ai", aiRouter);
router.use("/users", usersRouter);
router.use("/classes", classesRouter);
router.use("/sessions", sessionsRouter);
router.use("/sessions", messagesRouter);

// Routers to be mounted in upcoming phases:
// router.use("/vocabulary", vocabularyRouter);
// router.use("/goals", goalsRouter);
// router.use("/progress", progressRouter);
// router.use("/metrics", metricsRouter);
// router.use("/subscriptions", subscriptionsRouter);
// router.use("/admin", adminRouter);

export default router;
