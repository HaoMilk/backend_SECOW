import express from "express";
import {
  createProduct,
  updateProduct,
  hideProduct,
  approveProduct,
  rejectProduct,
} from "../controllers/productController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
// router.get("/metadata", getProductMetadata);
// router.get("/", getProducts);
// router.get("/:id", getProductById);

// Protected routes
router.post("/", authenticate, authorize("seller"), createProduct);
router.put("/:id", authenticate, authorize("seller"), updateProduct);
router.patch("/:id/hide", authenticate, authorize("seller", "admin"), hideProduct);

// Admin routes
router.patch("/:id/approve", authenticate, authorize("admin"), approveProduct);
router.patch("/:id/reject", authenticate, authorize("admin"), rejectProduct);


export default router;
