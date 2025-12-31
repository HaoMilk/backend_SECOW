import express from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  confirmDelivery,
  getSellerOrders,
  confirmOrder,
  rejectOrder,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";

const router = express.Router();

// Tất cả routes đều cần authenticate
router.use(authenticate);

// Customer routes
router.post("/", createOrder);
router.get("/", getMyOrders);
router.get("/:id", getOrderById);
router.put("/:id/cancel", cancelOrder);
router.put("/:id/confirm-delivery", confirmDelivery);

// Seller routes
router.get("/seller/list", authorize("seller", "admin"), getSellerOrders);
router.put("/:id/confirm", authorize("seller", "admin"), confirmOrder);
router.put("/:id/reject", authorize("seller", "admin"), rejectOrder);
router.put("/:id/status", authorize("seller", "admin"), updateOrderStatus);

export default router;

