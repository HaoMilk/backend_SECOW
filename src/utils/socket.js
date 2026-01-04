import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

let ioInstance = null;
const userIdToSockets = new Map(); // userId -> Set<socketId>

function addUserSocket(userId, socketId) {
  if (!userIdToSockets.has(userId)) {
    userIdToSockets.set(userId, new Set());
  }
  userIdToSockets.get(userId).add(socketId);
}

function removeUserSocket(userId, socketId) {
  const set = userIdToSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) {
    userIdToSockets.delete(userId);
  }
}

export function initSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      const tokenFromHeader = authHeader?.startsWith("Bearer ")
        ? authHeader.replace("Bearer ", "")
        : null;
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        tokenFromHeader;

      if (!token) {
        return next(new Error("UNAUTHORIZED"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");
      if (!user || !user.isActive) {
        return next(new Error("UNAUTHORIZED"));
      }

      socket.user = { _id: user._id.toString(), name: user.name, role: user.role };
      return next();
    } catch (err) {
      return next(new Error("UNAUTHORIZED"));
    }
  });

  ioInstance.on("connection", (socket) => {
    const userId = socket.user._id;
    addUserSocket(userId, socket.id);
    socket.join(`user:${userId}`);

    socket.on("disconnect", () => {
      removeUserSocket(userId, socket.id);
    });
  });

  return ioInstance;
}

export function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.IO not initialized");
  }
  return ioInstance;
}


