import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    storeName: {
      type: String,
      required: [true, "Tên cửa hàng là bắt buộc"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    isApproved: {
      type: Boolean,
      default: false, // Cần admin phê duyệt
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index
storeSchema.index({ seller: 1 });
storeSchema.index({ isApproved: 1 });

const Store = mongoose.model("Store", storeSchema);

export default Store;

