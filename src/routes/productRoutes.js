import express from "express";
import {
  createProduct,
  updateProduct,
  hideProduct,
  deleteProduct,
  approveProduct,
  rejectProduct,
  getProductsBySeller,
  getAdminProducts,
} from "../controllers/productController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

// Public routes
// router.get("/metadata", getProductMetadata);
// router.get("/", getProducts);
// router.get("/:id", getProductById);

// Seller routes
router.get("/seller", authenticate, authorize("seller"), getProductsBySeller);

// Protected routes
router.post("/", authenticate, authorize("seller"), upload, createProduct);
router.put("/:id", authenticate, authorize("seller"), upload, updateProduct);
router.patch("/:id/hide", authenticate, authorize("seller"), hideProduct);
router.delete("/:id/delete", authenticate, authorize("seller"), deleteProduct);

// Admin routes
router.get("/admin", getAdminProducts);
router.patch("/:id/approve", authenticate, authorize("admin"), approveProduct);
router.patch("/:id/reject", authenticate, authorize("admin"), rejectProduct);


export default router;
