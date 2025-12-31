import express from "express";
import {
  register,
  verifyOTP,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  refreshToken,
  changePassword,
  updateProfile,
  logout,
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
router.post("/refresh-token", refreshToken);

// Protected routes
router.get("/me", authenticate, getMe);
router.put("/profile", authenticate, updateProfile);
router.put("/change-password", authenticate, changePassword);
router.post("/logout", authenticate, logout);

export default router;

