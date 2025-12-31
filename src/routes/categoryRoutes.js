import express from "express";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getCategories);
router.get("/:id", getCategoryById);

// Admin routes
router.post("/", authenticate, authorize("admin"), createCategory);
router.put("/:id", authenticate, authorize("admin"), updateCategory);
router.delete("/:id", authenticate, authorize("admin"), deleteCategory);

export default router;

