import { createServer } from "http";
import app from "./app.ts";
import { env, logger } from "./config/index.ts";
import { connectDatabase, disconnectDatabase, resetDatabase } from "./config/database.ts";
import { initializeSocket } from "./socket/index.ts";
import { setIO } from "./socket/io-instance.ts";

async function bootstrap() {
  // 1. Reset DB if RESET_DB=true in .env (dev only — destroys all data)
  await resetDatabase();

  // 2. Test database connection and log table info
  await connectDatabase();

  // 3. Attach Socket.io to the HTTP server
  const httpServer = createServer(app);
  const io = initializeSocket(httpServer);
  setIO(io);

  // 4. Start HTTP server
  const server = httpServer.listen(env.PORT, () => {
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

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down gracefully...");
    io.close();
    server.close(async () => {
      await disconnectDatabase();
      logger.info("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

bootstrap().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
