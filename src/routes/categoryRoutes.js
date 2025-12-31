import express from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  disableCategory,
} from "../controllers/categoryController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getCategories);

// Admin routes
router.post("/", authenticate, authorize("admin"), createCategory);
router.put("/:id", authenticate, authorize("admin"), updateCategory);
router.patch("/:id/disable", authenticate, authorize("admin"), disableCategory);

export default router;
