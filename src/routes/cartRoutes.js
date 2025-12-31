import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../controllers/cartController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Tất cả routes đều cần authenticate
router.use(authenticate);

router.get("/", getCart);
router.post("/items", addToCart);
router.put("/items/:itemId", updateCartItem);
router.delete("/items/:itemId", removeFromCart);
router.delete("/", clearCart);

export default router;

