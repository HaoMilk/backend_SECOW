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

// @desc    Khóa/Mở khóa cửa hàng
// @route   PUT /api/v1/admin/stores/:storeId/status
// @access  Private (Admin)
export const updateStoreStatus = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { isActive } = req.body;

  const store = await Store.findById(storeId).populate("seller");

  if (!store) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy cửa hàng",
    });
  }

  if (!store.isApproved) {
    return res.status(400).json({
      success: false,
      message: "Không thể khóa/mở khóa cửa hàng chưa được phê duyệt",
    });
  }

  store.isActive = isActive;
  await store.save();

  res.status(200).json({
    success: true,
    message: isActive ? "Đã mở khóa cửa hàng" : "Đã khóa cửa hàng",
    data: {
      store: {
        id: store._id,
        storeName: store.storeName,
        isActive: store.isActive,
        seller: {
          id: store.seller._id,
          name: store.seller.name,
          email: store.seller.email,
        },
      },
    },
  });
});

// @desc    Lấy danh sách tất cả cửa hàng (đã phê duyệt)
// @route   GET /api/v1/admin/stores
// @access  Private (Admin)
export const getAllStores = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isActive, search } = req.query;

  const query = { isApproved: true };
  
  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  if (search) {
    query.$or = [
      { storeName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const stores = await Store.find(query)
    .populate("seller", "name email phone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Store.countDocuments(query);

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

// @desc    Lấy dữ liệu biểu đồ doanh thu theo thời gian
// @route   GET /api/v1/admin/stats/revenue-chart
// @access  Private (Admin)
export const getRevenueChart = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const daysNum = Number(days);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);
  startDate.setHours(0, 0, 0, 0);

  // Lấy dữ liệu doanh thu theo ngày
  const revenueData = await Order.aggregate([
    {
      $match: {
        status: "delivered",
        paymentStatus: "paid",
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%d/%m", date: "$createdAt" },
        },
        value: { $sum: "$totalAmount" },
        orderCount: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // Format dữ liệu cho biểu đồ
  const chartData = revenueData.map((item) => ({
    name: item._id,
    value: item.value,
    orderCount: item.orderCount,
  }));

  res.status(200).json({
    success: true,
    data: {
      chartData,
    },
  });
});

// @desc    Lấy dữ liệu tăng trưởng người dùng theo tuần
// @route   GET /api/v1/admin/stats/user-growth
// @access  Private (Admin)
export const getUserGrowthChart = asyncHandler(async (req, res) => {
  // Lấy dữ liệu 7 ngày gần nhất
  const days = [];
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    days.push({
      date,
      dayName: dayNames[date.getDay()],
    });
  }

  // Đếm số người dùng mới đăng ký mỗi ngày
  const userGrowthData = await Promise.all(
    days.map(async (day, index) => {
      const nextDay = index < days.length - 1 ? days[index + 1].date : new Date();
      nextDay.setHours(23, 59, 59, 999);

      const count = await User.countDocuments({
        createdAt: {
          $gte: day.date,
          $lt: nextDay,
        },
      });

      return {
        name: day.dayName,
        value: count,
      };
    })
  );

  // Tính tổng người dùng mới trong tuần
  const totalNewUsers = userGrowthData.reduce((sum, item) => sum + item.value, 0);

  // Tính phần trăm tăng trưởng (so với tuần trước)
  const lastWeekStart = new Date();
  lastWeekStart.setDate(lastWeekStart.getDate() - 13);
  lastWeekStart.setHours(0, 0, 0, 0);
  const lastWeekEnd = new Date();
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
  lastWeekEnd.setHours(23, 59, 59, 999);

  const lastWeekCount = await User.countDocuments({
    createdAt: {
      $gte: lastWeekStart,
      $lt: lastWeekEnd,
    },
  });

  const growthPercent = lastWeekCount > 0
    ? (((totalNewUsers - lastWeekCount) / lastWeekCount) * 100).toFixed(1)
    : totalNewUsers > 0 ? "100" : "0";

  res.status(200).json({
    success: true,
    data: {
      chartData: userGrowthData,
      totalNewUsers,
      growthPercent: parseFloat(growthPercent),
    },
  });
});

