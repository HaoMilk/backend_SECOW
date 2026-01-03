import express from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  disableCategory,
  getAdminCategories,
  getAdminCategoryById,
  getParentCategories,
} from "../controllers/categoryController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";
import { uploadCategoryImage } from "../config/cloudinary.js";

const router = express.Router();

// Public routes
router.get("/", getCategories);
router.get("/parents", getParentCategories);

// Admin routes
router.get("/admin", authenticate, authorize("admin"), getAdminCategories);
router.get("/admin/:id", authenticate, authorize("admin"), getAdminCategoryById);
router.post(
  "/",
  authenticate,
  authorize("admin"),
  uploadCategoryImage,
  createCategory
);
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  uploadCategoryImage,
  updateCategory
);
router.patch("/:id/disable", authenticate, authorize("admin"), disableCategory);

// Public route - phải đặt sau các routes cụ thể
router.get("/:id", getCategoryById);

export default router;
