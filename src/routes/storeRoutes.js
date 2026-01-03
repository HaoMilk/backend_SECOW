import express from "express";
import {
  registerStore,
  getMyStore,
  updateMyStore,
  getStoreById,
  getStoreBySellerId,
  getStoreStats,
} from "../controllers/storeController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";

const router = express.Router();

// Protected routes - Specific routes must come before generic :id route
router.post("/register", authenticate, registerStore);
router.get("/me/stats", authenticate, authorize("seller", "admin"), getStoreStats);
router.get("/me", authenticate, authorize("seller", "admin"), getMyStore);
router.put("/me", authenticate, authorize("seller", "admin"), updateMyStore);

// Public routes - Specific routes must come before generic :id route
router.get("/seller/:sellerId", getStoreBySellerId);

// Public routes - Generic route must come last
router.get("/:id", getStoreById);

export default router;

