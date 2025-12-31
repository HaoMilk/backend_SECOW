import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      length: 6,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 phút
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    purpose: {
      type: String,
      enum: ["email_verification", "password_reset"],
      default: "email_verification",
    },
  },
  {
    timestamps: true,
  }
);

// Tự động xóa OTP đã hết hạn (MongoDB TTL index)
// Lưu ý: MongoDB sẽ tự động xóa documents khi expiresAt < current time
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;

