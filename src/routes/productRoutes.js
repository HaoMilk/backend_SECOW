import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductMetadata,
  getSellerProducts,
} from "../controllers/productController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/metadata", getProductMetadata);
router.get("/", getProducts);

// Protected route - Lấy sản phẩm của seller (phải đặt TRƯỚC route /:id)
router.get("/seller", authenticate, authorize("seller", "admin"), getSellerProducts);

// Public route - Lấy sản phẩm theo ID (phải đặt SAU route /seller)
router.get("/:id", getProductById);

// Protected routes (cần authenticate)
router.post("/", authenticate, authorize("seller", "admin"), createProduct);
router.put("/:id", authenticate, updateProduct);
router.delete("/:id", authenticate, deleteProduct);

export default router;

