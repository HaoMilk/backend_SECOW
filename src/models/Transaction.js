import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "bank_transfer", "stripe", "vnpay"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentDetails: {
      // Lưu thông tin từ payment gateway
      transactionId: String,
      paymentIntentId: String,
      receiptUrl: String,
      metadata: mongoose.Schema.Types.Mixed,
    },
    completedAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index
transactionSchema.index({ transactionNumber: 1 });
transactionSchema.index({ order: 1 });
transactionSchema.index({ customer: 1 });
transactionSchema.index({ seller: 1 });
transactionSchema.index({ status: 1 });

// Pre-save hook để tạo transactionNumber
transactionSchema.pre("save", async function (next) {
  if (!this.transactionNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    this.transactionNumber = `TXN${timestamp}${random}`;
  }
  next();
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;

