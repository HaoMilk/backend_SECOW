import Transaction from "../models/Transaction.js";
import Order from "../models/Order.js";
import asyncHandler from "../middleware/asyncHandler.js";

// @desc    Lấy danh sách giao dịch
// @route   GET /api/v1/transactions
// @access  Private
export const getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  // Customer xem giao dịch của mình, Seller xem giao dịch của mình, Admin xem tất cả
  const query = {};
  if (req.user.role === "user") {
    query.customer = req.user._id;
  } else if (req.user.role === "seller") {
    query.seller = req.user._id;
  }

  if (status) {
    query.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const transactions = await Transaction.find(query)
    .populate("order", "orderNumber totalAmount status")
    .populate("customer", "name email")
    .populate("seller", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Transaction.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

// @desc    Lấy giao dịch theo ID
// @route   GET /api/v1/transactions/:id
// @access  Private
export const getTransactionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const transaction = await Transaction.findById(id)
    .populate("order")
    .populate("customer", "name email")
    .populate("seller", "name email");

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy giao dịch",
    });
  }

  // Kiểm tra quyền truy cập
  if (
    transaction.customer._id.toString() !== req.user._id.toString() &&
    transaction.seller._id.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Không có quyền truy cập giao dịch này",
    });
  }

  res.status(200).json({
    success: true,
    data: {
      transaction,
    },
  });
});

// @desc    Xử lý thanh toán (Mock payment)
// @route   POST /api/v1/transactions/:id/pay
// @access  Private
export const processPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentDetails } = req.body;

  const transaction = await Transaction.findById(id).populate("order");

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy giao dịch",
    });
  }

  if (transaction.customer.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền thanh toán giao dịch này",
    });
  }

  if (transaction.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "Giao dịch không ở trạng thái chờ thanh toán",
    });
  }

  // Mock payment - luôn thành công
  // Trong production, sẽ tích hợp với Stripe/VNPay ở đây
  transaction.status = "completed";
  transaction.completedAt = new Date();
  transaction.paymentDetails = {
    ...paymentDetails,
    mockPayment: true,
    paidAt: new Date(),
  };

  // Cập nhật order
  transaction.order.paymentStatus = "paid";
  await transaction.order.save();

  await transaction.save();

  res.status(200).json({
    success: true,
    message: "Thanh toán thành công",
    data: {
      transaction,
    },
  });
});

// @desc    Hoàn tiền (Mock refund)
// @route   POST /api/v1/transactions/:id/refund
// @access  Private (Admin/Seller)
export const refundTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const transaction = await Transaction.findById(id).populate("order");

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy giao dịch",
    });
  }

  // Chỉ seller của đơn hàng hoặc admin mới được hoàn tiền
  if (
    transaction.seller.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền hoàn tiền giao dịch này",
    });
  }

  if (transaction.status !== "completed") {
    return res.status(400).json({
      success: false,
      message: "Chỉ có thể hoàn tiền giao dịch đã hoàn thành",
    });
  }

  transaction.status = "refunded";
  transaction.paymentDetails = {
    ...transaction.paymentDetails,
    refundReason: reason,
    refundedAt: new Date(),
  };

  // Cập nhật order
  transaction.order.paymentStatus = "refunded";
  await transaction.order.save();

  await transaction.save();

  res.status(200).json({
    success: true,
    message: "Đã hoàn tiền thành công",
    data: {
      transaction,
    },
  });
});

