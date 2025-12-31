import mongoose from "mongoose";
import Review from "../models/Review.js";
import Order from "../models/Order.js";
import Store from "../models/Store.js";
import asyncHandler from "../middleware/asyncHandler.js";

// @desc    Tạo đánh giá
// @route   POST /api/v1/reviews
// @access  Private
export const createReview = asyncHandler(async (req, res) => {
  const { orderId, rating, comment, images } = req.body;

  // Kiểm tra đơn hàng
  const order = await Order.findById(orderId);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy đơn hàng",
    });
  }

  // Chỉ customer mới được đánh giá
  if (order.customer.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền đánh giá đơn hàng này",
    });
  }

  // Chỉ đánh giá được khi đơn hàng đã giao
  if (order.status !== "delivered") {
    return res.status(400).json({
      success: false,
      message: "Chỉ có thể đánh giá đơn hàng đã giao",
    });
  }

  // Kiểm tra đã đánh giá chưa
  const existingReview = await Review.findOne({ order: orderId });

  if (existingReview) {
    return res.status(400).json({
      success: false,
      message: "Bạn đã đánh giá đơn hàng này",
    });
  }

  // Tạo đánh giá
  const review = await Review.create({
    order: orderId,
    customer: req.user._id,
    seller: order.seller,
    product: order.items[0].product, // Lấy sản phẩm đầu tiên
    rating,
    comment,
    images: images || [],
    isVerified: true,
  });

  // Cập nhật rating của store
  await updateStoreRating(order.seller);

  await review.populate("customer", "name");
  await review.populate("seller", "name");
  await review.populate("product", "title images");

  res.status(201).json({
    success: true,
    message: "Đánh giá thành công",
    data: {
      review,
    },
  });
});

// @desc    Lấy đánh giá của seller
// @route   GET /api/v1/reviews/seller/:sellerId
// @access  Public
export const getSellerReviews = asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const reviews = await Review.find({ seller: sellerId })
    .populate("customer", "name avatar")
    .populate("product", "title images")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Review.countDocuments({ seller: sellerId });

  // Tính rating trung bình
  const avgRating = await Review.aggregate([
    { $match: { seller: new mongoose.Types.ObjectId(sellerId) } },
    { $group: { _id: null, avgRating: { $avg: "$rating" } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      reviews,
      averageRating: avgRating[0]?.avgRating || 0,
      totalReviews: total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

// @desc    Lấy đánh giá của sản phẩm
// @route   GET /api/v1/reviews/product/:productId
// @access  Public
export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const reviews = await Review.find({ product: productId })
    .populate("customer", "name avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Review.countDocuments({ product: productId });

  res.status(200).json({
    success: true,
    data: {
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

// Helper function để cập nhật rating của store
const updateStoreRating = async (sellerId) => {
  const reviews = await Review.find({ seller: sellerId });

  if (reviews.length === 0) return;

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;

  await Store.findOneAndUpdate(
    { seller: sellerId },
    {
      $set: {
        "rating.average": averageRating,
        "rating.count": reviews.length,
      },
    }
  );
};

