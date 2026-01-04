import express from "express";
import {
  createReview,
  getSellerReviews,
  getProductReviews,
  checkOrderReviewStatus,
  getOrderReviews,
} from "../controllers/reviewController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/seller/:sellerId", getSellerReviews);
router.get("/product/:productId", getProductReviews);

// Protected routes
router.use(authenticate);
router.post("/", createReview);
router.get("/order/:orderId/check", checkOrderReviewStatus);
router.get("/order/:orderId", getOrderReviews);

export default router;

