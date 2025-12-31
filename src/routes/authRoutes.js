import express from "express";
import {
  register,
  verifyOTP,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  getMe,
} from "../controllers/authController.js";
import {
  validate,
  registerValidation,
  verifyOTPValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from "../middleware/validation.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/register", validate(registerValidation), register);
router.post("/verify-otp", validate(verifyOTPValidation), verifyOTP);
router.post("/resend-otp", validate(forgotPasswordValidation), resendOTP);
router.post("/login", validate(loginValidation), login);
router.post("/forgot-password", validate(forgotPasswordValidation), forgotPassword);
router.post("/reset-password", validate(resetPasswordValidation), resetPassword);

// Protected routes
router.get("/me", authenticate, getMe);

export default router;

