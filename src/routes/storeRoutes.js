import express from "express";
import {
  registerStore,
  getMyStore,
  updateMyStore,
  getStoreById,
  getStoreStats,
} from "../controllers/storeController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/:id", getStoreById);

// Protected routes
router.post("/register", authenticate, registerStore);
router.get("/me/stats", authenticate, authorize("seller", "admin"), getStoreStats);
router.get("/me", authenticate, authorize("seller", "admin"), getMyStore);
router.put("/me", authenticate, authorize("seller", "admin"), updateMyStore);

export default router;

