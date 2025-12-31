import express from "express";
import {
  approveStore,
  rejectStore,
  getPendingStores,
  updateUserStatus,
  updateProductStatus,
  getSystemStats,
  getUsers,
  getPendingProducts,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";

const router = express.Router();

// Tất cả routes đều cần admin
router.use(authenticate);
router.use(authorize("admin"));

router.get("/stats", getSystemStats);
router.get("/users", getUsers);
router.get("/stores/pending", getPendingStores);
router.get("/products/pending", getPendingProducts);
router.put("/stores/:storeId/approve", approveStore);
router.put("/stores/:storeId/reject", rejectStore);
router.put("/users/:userId/status", updateUserStatus);
router.put("/products/:productId/status", updateProductStatus);

export default router;

