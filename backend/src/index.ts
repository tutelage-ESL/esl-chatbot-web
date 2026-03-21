import app from "./app.ts";
import { env, logger } from "./config/index.ts";

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  logger.info(`API docs: http://localhost:${env.PORT}/api-docs`);
});

// Graceful shutdown
const shutdown = () => {
  logger.info("Shutting down gracefully...");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
