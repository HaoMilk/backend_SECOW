import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    isVerified: {
      type: Boolean,
      default: false, // Đánh giá từ đơn hàng đã giao
    },
  },
  {
    timestamps: true,
  }
);

// Index
reviewSchema.index({ seller: 1 });
reviewSchema.index({ product: 1 });
reviewSchema.index({ order: 1 });
reviewSchema.index({ createdAt: -1 });

// Đảm bảo mỗi đơn hàng chỉ có 1 đánh giá
reviewSchema.index({ order: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);

export default Review;

