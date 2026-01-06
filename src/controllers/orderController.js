import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Transaction from "../models/Transaction.js";
import Review from "../models/Review.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { sendOrderStatusUpdateEmail } from "../services/emailService.js";
import { getIO } from "../utils/socket.js";

// Helper function để gửi thông báo cập nhật trạng thái đơn hàng
const notifyOrderStatusUpdate = async (order, newStatus, updatedBy) => {
  try {
    // Populate customer và seller nếu chưa có (kiểm tra xem có phải ObjectId không)
    if (!order.customer.email || typeof order.customer.email === 'undefined') {
      await order.populate("customer", "name email");
    }
    if (!order.seller.email || typeof order.seller.email === 'undefined') {
      await order.populate("seller", "name email");
    }

    const orderData = {
      _id: order._id,
      id: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
    };

    // Gửi email cho customer
    if (order.customer && order.customer.email) {
      await sendOrderStatusUpdateEmail(
        order.customer.email,
        orderData,
        newStatus,
        "customer"
      );
    }

    // Gửi email cho seller (nếu seller khác với người cập nhật)
    const sellerIdStr = (order.seller._id || order.seller).toString();
    const updatedByStr = updatedBy.toString();
    if (order.seller && order.seller.email && sellerIdStr !== updatedByStr) {
      await sendOrderStatusUpdateEmail(
        order.seller.email,
        orderData,
        newStatus,
        "seller"
      );
    }

    // Mapping trạng thái sang tiếng Việt
    const statusMap = {
      pending: "Chờ xác nhận",
      confirmed: "Đã xác nhận",
      packaged: "Đã đóng gói",
      shipped: "Đã gửi hàng",
      delivered: "Đã giao hàng",
      cancelled: "Đã hủy",
      rejected: "Đã từ chối",
    };
    const statusText = statusMap[newStatus] || newStatus;

    // Gửi notification qua socket.io cho customer
    try {
      const io = getIO();
      const customerIdStr = (order.customer._id || order.customer).toString();
      io.to(`user:${customerIdStr}`).emit("order:status-updated", {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        status: newStatus,
        statusText: statusText,
        message: `Đơn hàng #${order.orderNumber} đã được cập nhật trạng thái thành "${statusText}"`,
        timestamp: new Date().toISOString(),
      });
    } catch (socketError) {
      console.error("Error sending socket notification:", socketError);
    }

    // Gửi notification qua socket.io cho seller (nếu khác với người cập nhật)
    if (sellerIdStr !== updatedByStr) {
      try {
        const io = getIO();
        io.to(`user:${sellerIdStr}`).emit("order:status-updated", {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          status: newStatus,
          statusText: statusText,
          message: `Đơn hàng #${order.orderNumber} đã được cập nhật trạng thái thành "${statusText}"`,
          timestamp: new Date().toISOString(),
        });
      } catch (socketError) {
        console.error("Error sending socket notification:", socketError);
      }
    }
  } catch (error) {
    // Log error nhưng không throw để không làm gián đoạn flow chính
    console.error("Error sending order status notification:", error);
  }
};

// @desc    Tạo đơn hàng từ giỏ hàng
// @route   POST /api/v1/orders
// @access  Private
export const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod = "cod", notes } = req.body;

  // Lấy giỏ hàng
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product"
  );

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Giỏ hàng trống",
    });
  }

  // Validate shipping address
  if (
    !shippingAddress?.fullName ||
    !shippingAddress?.phone ||
    !shippingAddress?.address ||
    !shippingAddress?.city
  ) {
    return res.status(400).json({
      success: false,
      message: "Thông tin địa chỉ giao hàng không đầy đủ",
    });
  }

  // Kiểm tra stock và tính tổng tiền
  let totalAmount = 0;
  const orderItems = [];
  
  // Kiểm tra sản phẩm đầu tiên có tồn tại không
  if (!cart.items[0]?.product || !cart.items[0].product.seller) {
    return res.status(400).json({
      success: false,
      message: "Giỏ hàng chứa sản phẩm không hợp lệ",
    });
  }
  
  const sellerId = cart.items[0].product.seller.toString();
  
  // Validate sellerId là ObjectId hợp lệ
  if (!sellerId || sellerId === "null" || sellerId === "undefined") {
    return res.status(400).json({
      success: false,
      message: "Thông tin người bán không hợp lệ",
    });
  }

  for (const item of cart.items) {
    // Kiểm tra item.product có tồn tại không
    if (!item.product || !item.product._id) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng chứa sản phẩm không hợp lệ",
      });
    }
    
    const product = await Product.findById(item.product._id);

    if (!product || product.status !== "active") {
      return res.status(400).json({
        success: false,
        message: `Sản phẩm ${product?.title || "N/A"} không khả dụng`,
      });
    }

    if (product.stock < item.quantity) {
      return res.status(400).json({
        success: false,
        message: `Sản phẩm ${product.title} không đủ số lượng`,
      });
    }

    // Tất cả sản phẩm phải cùng một seller
    if (product.seller.toString() !== sellerId) {
      return res.status(400).json({
        success: false,
        message: "Tất cả sản phẩm phải từ cùng một người bán",
      });
    }

    const subtotal = product.price * item.quantity;
    totalAmount += subtotal;

    orderItems.push({
      product: product._id,
      productName: product.title,
      productImage: product.images?.[0] || null,
      price: product.price,
      quantity: item.quantity,
      subtotal,
    });
  }

  // Kiểm tra có sản phẩm hợp lệ không
  if (orderItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Không có sản phẩm hợp lệ để tạo đơn hàng",
    });
  }

  // Tạo đơn hàng
  let order;
  try {
    order = await Order.create({
      customer: req.user._id,
      seller: sellerId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      notes,
      status: "pending",
      paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
    });
  } catch (error) {
    // Xử lý lỗi duplicate key (orderNumber trùng lặp - rất hiếm)
    if (error.code === 11000) {
      // Retry với orderNumber mới
      order = await Order.create({
        customer: req.user._id,
        seller: sellerId,
        items: orderItems,
        totalAmount,
        shippingAddress,
        paymentMethod,
        notes,
        status: "pending",
        paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
      });
    } else {
      throw error;
    }
  }

  // Giảm stock
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(item.product._id, {
      $inc: { stock: -item.quantity },
    });
  }

  // Xóa giỏ hàng
  cart.items = [];
  await cart.save();

  // Tạo transaction nếu không phải COD
  if (paymentMethod !== "cod") {
    await Transaction.create({
      order: order._id,
      customer: req.user._id,
      seller: sellerId,
      amount: totalAmount,
      paymentMethod,
      status: "pending",
    });
  }

  await order.populate("customer", "name email phone");
  await order.populate("seller", "name email");

  res.status(201).json({
    success: true,
    message: "Tạo đơn hàng thành công",
    data: {
      order,
    },
  });
});

// @desc    Lấy danh sách đơn hàng của customer
// @route   GET /api/v1/orders
// @access  Private
export const getMyOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const query = { customer: req.user._id };
  if (status) {
    query.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const orders = await Order.find(query)
    .populate("seller", "name email")
    .populate("items.product", "title images")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Order.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

// @desc    Lấy đơn hàng theo ID
// @route   GET /api/v1/orders/:id
// @access  Private
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id)
    .populate("customer", "name email phone")
    .populate("seller", "name email phone")
    .populate("items.product", "title images condition");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy đơn hàng",
    });
  }

  // Kiểm tra quyền truy cập
  if (
    order.customer._id.toString() !== req.user._id.toString() &&
    order.seller._id.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Không có quyền truy cập đơn hàng này",
    });
  }

  // Lấy thông tin đánh giá nếu đơn hàng đã giao
  let reviewInfo = null;
  if (order.status === "delivered") {
    const reviews = await Review.find({ order: id }).select("product");
    const reviewedProductIds = reviews.map((r) => r.product.toString());
    
    reviewInfo = {
      canReview: true,
      reviewedProducts: reviewedProductIds,
      allReviewed: order.items.every((item) =>
        reviewedProductIds.includes(item.product.toString())
      ),
    };
  }

  const orderObj = order.toObject();
  if (reviewInfo) {
    orderObj.reviewInfo = reviewInfo;
  }

  res.status(200).json({
    success: true,
    data: {
      order: orderObj,
    },
  });
});

// @desc    Hủy đơn hàng (customer)
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
export const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const order = await Order.findById(id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy đơn hàng",
    });
  }

  // Chỉ customer mới được hủy
  if (order.customer.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền hủy đơn hàng này",
    });
  }

  // Chỉ hủy được khi đơn hàng ở trạng thái pending hoặc confirmed
  if (!["pending", "confirmed"].includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: "Không thể hủy đơn hàng ở trạng thái này",
    });
  }

  order.status = "cancelled";
  order.cancelledAt = new Date();
  order.cancelledBy = req.user._id;
  order.cancellationReason = reason;

  // Hoàn lại stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    });
  }

  await order.save();

  // Gửi thông báo khi hủy đơn hàng
  await notifyOrderStatusUpdate(order, "cancelled", req.user._id);

  res.status(200).json({
    success: true,
    message: "Đã hủy đơn hàng",
    data: {
      order,
    },
  });
});

// @desc    Xác nhận đã nhận hàng (customer)
// @route   PUT /api/v1/orders/:id/confirm-delivery
// @access  Private
export const confirmDelivery = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy đơn hàng",
    });
  }

  if (order.customer.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền xác nhận đơn hàng này",
    });
  }

  // Kiểm tra trạng thái đơn hàng
  if (order.status === "delivered") {
    return res.status(400).json({
      success: false,
      message: "Đơn hàng đã được xác nhận nhận hàng trước đó",
    });
  }

  if (order.status !== "shipped") {
    return res.status(400).json({
      success: false,
      message: `Không thể xác nhận nhận hàng. Trạng thái hiện tại: ${order.status}. Đơn hàng phải ở trạng thái "shipped" (đã gửi hàng)`,
    });
  }

  order.status = "delivered";
  order.deliveredAt = new Date();
  order.paymentStatus = "paid";

  // Cập nhật transaction nếu có
  const transaction = await Transaction.findOne({ order: order._id });
  if (transaction) {
    transaction.status = "completed";
    transaction.completedAt = new Date();
    await transaction.save();
  }

  await order.save();

  // Gửi thông báo khi xác nhận nhận hàng
  await notifyOrderStatusUpdate(order, "delivered", req.user._id);

  res.status(200).json({
    success: true,
    message: "Đã xác nhận nhận hàng",
    data: {
      order,
    },
  });
});

// @desc    Lấy danh sách đơn hàng của seller
// @route   GET /api/v1/orders/seller
// @access  Private (Seller)
export const getSellerOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const query = { seller: req.user._id };
  if (status) {
    query.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const orders = await Order.find(query)
    .populate("customer", "name email phone")
    .populate("items.product", "title images")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Order.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

// @desc    Xác nhận đơn hàng (seller)
// @route   PUT /api/v1/orders/:id/confirm
// @access  Private (Seller)
export const confirmOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy đơn hàng",
    });
  }

  if (order.seller.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền xác nhận đơn hàng này",
    });
  }

  if (order.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "Đơn hàng không ở trạng thái chờ xác nhận",
    });
  }

  order.status = "confirmed";
  await order.save();

  // Gửi thông báo khi xác nhận đơn hàng
  await notifyOrderStatusUpdate(order, "confirmed", req.user._id);

  res.status(200).json({
    success: true,
    message: "Đã xác nhận đơn hàng",
    data: {
      order,
    },
  });
});

// @desc    Từ chối đơn hàng (seller)
// @route   PUT /api/v1/orders/:id/reject
// @access  Private (Seller)
export const rejectOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const order = await Order.findById(id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy đơn hàng",
    });
  }

  if (order.seller.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền từ chối đơn hàng này",
    });
  }

  if (order.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "Đơn hàng không ở trạng thái chờ xác nhận",
    });
  }

  order.status = "rejected";
  order.cancellationReason = reason;
  order.cancelledAt = new Date();
  order.cancelledBy = req.user._id;

  // Hoàn lại stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    });
  }

  await order.save();

  // Gửi thông báo khi từ chối đơn hàng
  await notifyOrderStatusUpdate(order, "rejected", req.user._id);

  res.status(200).json({
    success: true,
    message: "Đã từ chối đơn hàng",
    data: {
      order,
    },
  });
});

// @desc    Cập nhật trạng thái đơn hàng (seller)
// @route   PUT /api/v1/orders/:id/status
// @access  Private (Seller)
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["packaged", "shipped"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Trạng thái không hợp lệ",
    });
  }

  const order = await Order.findById(id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy đơn hàng",
    });
  }

  if (order.seller.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền cập nhật đơn hàng này",
    });
  }

  const oldStatus = order.status;
  order.status = status;
  await order.save();

  // Gửi thông báo khi cập nhật trạng thái
  await notifyOrderStatusUpdate(order, status, req.user._id);

  res.status(200).json({
    success: true,
    message: "Đã cập nhật trạng thái đơn hàng",
    data: {
      order,
    },
  });
});

// @desc    Lấy danh sách tất cả đơn hàng (Admin)
// @route   GET /api/v1/admin/orders
// @access  Private (Admin)
export const getAllOrders = asyncHandler(async (req, res) => {
  const { status, paymentStatus, page = 1, limit = 10, customerId, sellerId } = req.query;

  const query = {};
  
  // Filter by status
  if (status) {
    query.status = status;
  }
  
  // Filter by payment status
  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }
  
  // Filter by customer
  if (customerId) {
    query.customer = customerId;
  }
  
  // Filter by seller
  if (sellerId) {
    query.seller = sellerId;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const orders = await Order.find(query)
    .populate("customer", "name email phone")
    .populate("seller", "name email")
    .populate("items.product", "title images")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Order.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

