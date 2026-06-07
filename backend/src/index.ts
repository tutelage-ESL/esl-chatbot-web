// Sentry must be initialized before any other import so its instrumentation
// can wrap all downstream modules (Express, Prisma, HTTP clients, etc.)
import { Sentry } from "./config/sentry.ts";

import { createServer } from "http";
import app from "./app.ts";
import { env, logger, connectRedis, disconnectRedis } from "./config/index.ts";
import { connectDatabase, disconnectDatabase, resetDatabase } from "./config/database.ts";
import { initializeSocket } from "./socket/index.ts";
import { setIO } from "./socket/io-instance.ts";
import { startCronJobs, stopCronJobs } from "./jobs/index.ts";

async function bootstrap() {
  // 1. Reset DB if RESET_DB=true in .env (dev only — destroys all data)
  await resetDatabase();

  // 2. Test database connection and log table info
  await connectDatabase();

  // 3. Connect to Redis (non-fatal — cache gracefully degrades to DB if unavailable)
  await connectRedis();

  // 4. Attach Socket.io to the HTTP server
  const httpServer = createServer(app);
  const io = initializeSocket(httpServer);
  setIO(io);

  // 5. Start HTTP server
  const server = httpServer.listen(env.PORT, "0.0.0.0", () => {
    console.log("┌─────────────────────────────────────────┐");
    console.log("│           SERVER STARTED                 │");
    console.log("└─────────────────────────────────────────┘");
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
    console.log(`📚 API docs:  http://localhost:${env.PORT}/api-docs`);
    console.log(`🏥 Health:    http://localhost:${env.PORT}/health`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log("");
    logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });

  // 6. Start background cron jobs
  startCronJobs();

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down gracefully...");
    stopCronJobs();
    io.close();
    server.close(async () => {
      await disconnectRedis();
      await disconnectDatabase();
      logger.info("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

bootstrap().catch((err) => {
  Sentry.captureException(err);
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});

// Catch promises that were rejected but never had a .catch() handler.
// Common source: fire-and-forget async calls in socket handlers or jobs.
process.on("unhandledRejection", (reason) => {
  logger.error("[process] Unhandled promise rejection", { reason });
  Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
});

// Catch synchronous exceptions that escape all try/catch blocks.
// The process must exit afterward — V8 state is undefined after an uncaught exception.
process.on("uncaughtException", async (err) => {
  logger.error("[process] Uncaught exception — shutting down", { error: err });
  Sentry.captureException(err);
  await Sentry.close(2000); // flush pending events before exit
  process.exit(1);
});
