import type { Namespace } from "socket.io";
import type { AuthSocket } from "./index.ts";

// Handles the /notifications namespace.
// On connect: socket auto-joins the user's personal room so any service can push
// to a user with: io.of('/notifications').to(`user:${userId}`).emit('notification:new', data)
// No client-side events needed — this namespace is server-push only.

export function initNotificationsHandlers(namespace: Namespace): void {
  namespace.on("connection", (socket: AuthSocket) => {
    const userId = socket.data.user.id;
    socket.join(`user:${userId}`);
  });
}
