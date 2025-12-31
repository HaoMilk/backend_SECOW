import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tên sản phẩm là bắt buộc"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Giá sản phẩm là bắt buộc"],
      min: [0, "Giá không được âm"],
    },
    images: {
      type: [String],
      default: [],
    },
    condition: {
      type: String,
      enum: ["Like New", "Tốt", "Khá", "Cũ"],
      default: "Tốt",
    },
    categoryId: {
      type: String,
      required: [true, "Danh mục là bắt buộc"],
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Người bán là bắt buộc"],
    },
    sellerName: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: [true, "Địa điểm là bắt buộc"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "hidden", "violation", "draft"],
      default: "pending",
    },
    stock: {
      type: Number,
      default: 1,
      min: [0, "Số lượng không được âm"],
    },
    sku: {
      type: String,
      trim: true,
    },
    violationReason: {
      type: String,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index để tìm kiếm nhanh
productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ price: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;

