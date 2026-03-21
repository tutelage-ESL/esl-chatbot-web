import { Router } from "express";
import usersRouter from "../../modules/users/users.router.ts";
import authRouter from "../../modules/auth/auth.router.ts";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", usersRouter);

// Routers to be mounted in upcoming phases:
// router.use("/enrollment", enrollmentRouter);
// router.use("/sessions", sessionsRouter);
// router.use("/messages", messagesRouter);
// router.use("/vocabulary", vocabularyRouter);
// router.use("/goals", goalsRouter);
// router.use("/progress", progressRouter);
// router.use("/metrics", metricsRouter);
// router.use("/subscriptions", subscriptionsRouter);
// router.use("/admin", adminRouter);

export default router;
