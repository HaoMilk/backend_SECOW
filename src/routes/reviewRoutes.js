import express from "express";
import {
  createReview,
  getSellerReviews,
  getProductReviews,
} from "../controllers/reviewController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/seller/:sellerId", getSellerReviews);
router.get("/product/:productId", getProductReviews);

// Protected routes
router.post("/", authenticate, createReview);

export default router;

