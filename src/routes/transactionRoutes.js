import express from "express";
import {
  getTransactions,
  getTransactionById,
  processPayment,
  refundTransaction,
} from "../controllers/transactionController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";

const router = express.Router();

// Tất cả routes đều cần authenticate
router.use(authenticate);

router.get("/", getTransactions);
router.get("/:id", getTransactionById);
router.post("/:id/pay", processPayment);
router.post("/:id/refund", authorize("seller", "admin"), refundTransaction);

export default router;

