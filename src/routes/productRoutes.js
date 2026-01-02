import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductMetadata,
  getSellerProducts,
  getAdminProducts,
  approveProduct,
  rejectProduct,
} from "../controllers/productController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

// Public routes
router.get("/metadata", getProductMetadata);
router.get("/", getProducts);

// Admin routes (phải đặt TRƯỚC route /:id để tránh conflict)
router.get("/admin", authenticate, authorize("admin"), getAdminProducts);

// Protected route - Lấy sản phẩm của seller (phải đặt TRƯỚC route /:id)
router.get("/seller", authenticate, authorize("seller", "admin"), getSellerProducts);

// Public route - Lấy sản phẩm theo ID (phải đặt SAU route /seller và /admin)
router.get("/:id", getProductById);

// Protected routes (cần authenticate)
router.post("/", authenticate, authorize("seller", "admin"), upload.array("images", 5), createProduct);
router.put("/:id", authenticate, upload.array("images", 5), updateProduct);
router.delete("/:id", authenticate, deleteProduct);

// Admin approval routes (phải đặt SAU route /:id để tránh conflict)
router.patch("/:id/approve", authenticate, authorize("admin"), approveProduct);
router.patch("/:id/reject", authenticate, authorize("admin"), rejectProduct);

export default router;

