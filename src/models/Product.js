import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tên sản phẩm là bắt buộc"],
      trim: true,
      maxLength: [200, "Tên sản phẩm không được quá 200 ký tự"],
    },
    description: {
      type: String,
      trim: true,
      maxLength: [5000, "Mô tả không được quá 5000 ký tự"],
    },
    attributes: [
      {
        name: { type: String }, // Tên thuộc tính (VD: Màu, Size)
        value: { type: String } // Giá trị (VD: Đỏ, XL)
      }
    ],
    price: {
      type: Number,
      required: [true, "Giá sản phẩm là bắt buộc"],
      min: [0, "Giá không được âm"],
    },
    originalPrice: {
      type: Number,
      min: [0, "Giá gốc không được âm"],
      validate: {
        validator: function (value) {
          return !value || value >= this.price;
        },
        message: "Giá gốc phải lớn hơn hoặc bằng giá bán",
      },
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (val) {
          return val.length <= 5;
        },
        message: "Chỉ được đăng tối đa 5 ảnh",
      },
    },
    video:{
      type: String,
      trim: true,
    },
    condition: {
      type: String,
      enum: ["Like New", "Good", "Fair", "Old"],
      default: "Good",
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Danh mục là bắt buộc"],
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Người bán là bắt buộc"],
    },
    location: {
      type: {
        city: { type: String, required: true },
        district: { type: String },
        detail: { type: String },
      },
      _id: false,
    },
    status: {
      type: String,
      enum: ["active", "pending", "hidden", "violation", "draft", "sold"],
      default: "pending",
    },
    weight:{
      type: Number,
      default: 0,
    },
    brand:{
      type: String,
    },
    stock: {
      type: Number,
      default: 1,
      min: [0, "Số lượng không được âm"],
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

