import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductMetadata,
} from "../controllers/productController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/metadata", getProductMetadata);
router.get("/", getProducts);
router.get("/:id", getProductById);

// Protected routes (cần authenticate)
router.post("/", authenticate, authorize("seller", "admin"), createProduct);
router.put("/:id", authenticate, updateProduct);
router.delete("/:id", authenticate, deleteProduct);

export default router;

