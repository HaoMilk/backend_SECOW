import express from "express";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesForAdmin,
  getParentCategories,
  disableCategory,
} from "../controllers/categoryController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

// Public routes
router.get("/", getCategories);
router.get("/parents", getParentCategories);

// Admin routes - phải đặt trước /:id để tránh conflict
router.get(
  "/admin",
  authenticate,
  authorize("admin"),
  getCategoriesForAdmin
);

// Admin routes với upload middleware
router.post(
  "/",
  authenticate,
  authorize("admin"),
  upload.fields([{ name: "image", maxCount: 1 }]),
  createCategory
);
router.patch(
  "/:id/disable",
  authenticate,
  authorize("admin"),
  disableCategory
);
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  upload.fields([{ name: "image", maxCount: 1 }]),
  updateCategory
);
router.delete("/:id", authenticate, authorize("admin"), deleteCategory);

// Public route - phải đặt sau các routes cụ thể
router.get("/:id", getCategoryById);

export default router;

