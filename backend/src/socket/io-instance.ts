import type { Server } from "socket.io";

let _io: Server | null = null;

export function setIO(io: Server): void {
  _io = io;
}

export function getIO(): Server {
  if (!_io) throw new Error("Socket.io server not initialized");
  return _io;
}
