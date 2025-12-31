import express from "express";
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
} from "../controllers/messageController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Tất cả routes đều cần authenticate
router.use(authenticate);

router.get("/conversations", getConversations);
router.get("/conversations/:conversationId", getMessages);
router.post("/", sendMessage);
router.put("/:messageId/read", markAsRead);

export default router;

