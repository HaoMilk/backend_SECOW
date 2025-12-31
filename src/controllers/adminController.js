import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Store from "../models/Store.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import asyncHandler from "../middleware/asyncHandler.js";

// @desc    Phê duyệt người bán
// @route   PUT /api/v1/admin/stores/:storeId/approve
// @access  Private (Admin)
export const approveStore = asyncHandler(async (req, res) => {
  const { storeId } = req.params;

  const store = await Store.findById(storeId).populate("seller");

  if (!store) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy cửa hàng",
    });
  }

  if (store.isApproved) {
    return res.status(400).json({
      success: false,
      message: "Cửa hàng đã được phê duyệt",
    });
  }

  store.isApproved = true;
  store.approvedAt = new Date();
  store.approvedBy = req.user._id;
  await store.save();

  // Cập nhật role của user thành seller
  await User.findByIdAndUpdate(store.seller._id, {
    role: "seller",
  });

  res.status(200).json({
    success: true,
    message: "Đã phê duyệt cửa hàng",
    data: {
      store,
    },
  });
});

// @desc    Từ chối người bán
// @route   PUT /api/v1/admin/stores/:storeId/reject
// @access  Private (Admin)
export const rejectStore = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { reason } = req.body;

  const store = await Store.findById(storeId);

  if (!store) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy cửa hàng",
    });
  }

  await Store.findByIdAndDelete(storeId);

  res.status(200).json({
    success: true,
    message: "Đã từ chối cửa hàng",
  });
});

// @desc    Lấy danh sách cửa hàng chờ phê duyệt
// @route   GET /api/v1/admin/stores/pending
// @access  Private (Admin)
export const getPendingStores = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const stores = await Store.find({ isApproved: false })
    .populate("seller", "name email phone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Store.countDocuments({ isApproved: false });

  res.status(200).json({
    success: true,
    data: {
      stores,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

// @desc    Khóa/Mở tài khoản
// @route   PUT /api/v1/admin/users/:userId/status
// @access  Private (Admin)
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy người dùng",
    });
  }

  if (user.role === "admin") {
    return res.status(400).json({
      success: false,
      message: "Không thể khóa tài khoản admin",
    });
  }

  user.isActive = isActive;
  await user.save();

  res.status(200).json({
    success: true,
    message: isActive ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    },
  });
});

// @desc    Duyệt/Từ chối sản phẩm
// @route   PUT /api/v1/admin/products/:productId/status
// @access  Private (Admin)
export const updateProductStatus = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { status, violationReason } = req.body;

  const validStatuses = ["active", "hidden", "violation"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Trạng thái không hợp lệ",
    });
  }

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy sản phẩm",
    });
  }

  product.status = status;
  if (status === "violation" && violationReason) {
    product.violationReason = violationReason;
  }

  await product.save();

  res.status(200).json({
    success: true,
    message: "Đã cập nhật trạng thái sản phẩm",
    data: {
      product,
    },
  });
});

// @desc    Lấy thống kê hệ thống
// @route   GET /api/v1/admin/stats
// @access  Private (Admin)
export const getSystemStats = asyncHandler(async (req, res) => {
  // Thống kê users
  const totalUsers = await User.countDocuments();
  const totalSellers = await User.countDocuments({ role: "seller" });
  const activeUsers = await User.countDocuments({ isActive: true });

  // Thống kê products
  const totalProducts = await Product.countDocuments();
  const activeProducts = await Product.countDocuments({ status: "active" });
  const pendingProducts = await Product.countDocuments({ status: "pending" });

  // Thống kê orders
  const totalOrders = await Order.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: "pending" });
  const deliveredOrders = await Order.countDocuments({ status: "delivered" });

  // Thống kê revenue
  const revenueData = await Order.aggregate([
    {
      $match: {
        status: "delivered",
        paymentStatus: "paid",
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  const totalRevenue = revenueData[0]?.totalRevenue || 0;

  // Thống kê stores
  const totalStores = await Store.countDocuments();
  const approvedStores = await Store.countDocuments({ isApproved: true });
  const pendingStores = await Store.countDocuments({ isApproved: false });

  // Thống kê categories
  const totalCategories = await Category.countDocuments({ isActive: true });

  res.status(200).json({
    success: true,
    data: {
      stats: {
        users: {
          total: totalUsers,
          sellers: totalSellers,
          active: activeUsers,
        },
        products: {
          total: totalProducts,
          active: activeProducts,
          pending: pendingProducts,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          delivered: deliveredOrders,
        },
        revenue: {
          total: totalRevenue,
        },
        stores: {
          total: totalStores,
          approved: approvedStores,
          pending: pendingStores,
        },
        categories: {
          total: totalCategories,
        },
      },
    },
  });
});

// @desc    Lấy danh sách users
// @route   GET /api/v1/admin/users
// @access  Private (Admin)
export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, isActive } = req.query;

  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === "true";

  const skip = (Number(page) - 1) * Number(limit);

  const users = await User.find(query)
    .select("-password -refreshToken")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

// @desc    Lấy danh sách sản phẩm chờ duyệt
// @route   GET /api/v1/admin/products/pending
// @access  Private (Admin)
export const getPendingProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const products = await Product.find({ status: "pending" })
    .populate("seller", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Product.countDocuments({ status: "pending" });

  res.status(200).json({
    success: true,
    data: {
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

