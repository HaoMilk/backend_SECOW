import Store from "../models/Store.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import asyncHandler from "../middleware/asyncHandler.js";

// @desc    Đăng ký trở thành người bán
// @route   POST /api/v1/stores/register
// @access  Private
export const registerStore = asyncHandler(async (req, res) => {
  const { storeName, description, address, phone, email, logo, coverImage } = req.body;

  // Kiểm tra user đã có store chưa
  const existingStore = await Store.findOne({ seller: req.user._id });

  if (existingStore) {
    return res.status(400).json({
      success: false,
      message: "Bạn đã đăng ký cửa hàng",
    });
  }

  // Tạo store
  const store = await Store.create({
    seller: req.user._id,
    storeName,
    description,
    address,
    phone,
    email,
    logo,
    coverImage,
    isApproved: false, // Cần admin phê duyệt
  });

  // Cập nhật role của user thành seller (pending approval)
  // Role sẽ được cập nhật khi admin approve

  res.status(201).json({
    success: true,
    message: "Đăng ký cửa hàng thành công. Vui lòng chờ admin phê duyệt.",
    data: {
      store,
    },
  });
});

// @desc    Lấy thông tin cửa hàng của tôi
// @route   GET /api/v1/stores/me
// @access  Private (Seller)
export const getMyStore = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ seller: req.user._id }).populate(
    "seller",
    "name email phone"
  );

  if (!store) {
    return res.status(404).json({
      success: false,
      message: "Bạn chưa đăng ký cửa hàng",
    });
  }

  res.status(200).json({
    success: true,
    data: {
      store,
    },
  });
});

// @desc    Cập nhật thông tin cửa hàng
// @route   PUT /api/v1/stores/me
// @access  Private (Seller)
export const updateMyStore = asyncHandler(async (req, res) => {
  const updateData = req.body;

  const store = await Store.findOne({ seller: req.user._id });

  if (!store) {
    return res.status(404).json({
      success: false,
      message: "Bạn chưa đăng ký cửa hàng",
    });
  }

  // Không cho phép cập nhật một số trường
  delete updateData.seller;
  delete updateData.isApproved;
  delete updateData.approvedAt;
  delete updateData.approvedBy;
  delete updateData.rating;
  delete updateData.totalSales;
  delete updateData.totalRevenue;

  Object.assign(store, updateData);
  await store.save();

  res.status(200).json({
    success: true,
    message: "Cập nhật thông tin cửa hàng thành công",
    data: {
      store,
    },
  });
});

// @desc    Lấy thông tin cửa hàng theo seller ID
// @route   GET /api/v1/stores/seller/:sellerId
// @access  Public
export const getStoreBySellerId = asyncHandler(async (req, res) => {
  const { sellerId } = req.params;

  const store = await Store.findOne({ seller: sellerId, isApproved: true })
    .populate("seller", "name email phone avatar")
    .populate("approvedBy", "name");

  if (!store) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy cửa hàng",
    });
  }

  // Lấy thống kê
  const productCount = await Product.countDocuments({
    seller: store.seller._id,
    status: "active",
  });

  const orderCount = await Order.countDocuments({
    seller: store.seller._id,
    status: "delivered",
  });

  res.status(200).json({
    success: true,
    data: {
      store: {
        ...store.toObject(),
        stats: {
          productCount,
          orderCount,
        },
      },
    },
  });
});

// @desc    Lấy thông tin cửa hàng theo ID
// @route   GET /api/v1/stores/:id
// @access  Public
export const getStoreById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const store = await Store.findById(id)
    .populate("seller", "name email phone avatar")
    .populate("approvedBy", "name");

  if (!store || !store.isApproved) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy cửa hàng",
    });
  }

  // Lấy thống kê
  const productCount = await Product.countDocuments({
    seller: store.seller._id,
    status: "active",
  });

  const orderCount = await Order.countDocuments({
    seller: store.seller._id,
    status: "delivered",
  });

  res.status(200).json({
    success: true,
    data: {
      store: {
        ...store.toObject(),
        stats: {
          productCount,
          orderCount,
        },
      },
    },
  });
});

// @desc    Lấy doanh thu và hiệu suất bán hàng
// @route   GET /api/v1/stores/me/stats
// @access  Private (Seller)
export const getStoreStats = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ seller: req.user._id });

  if (!store) {
    return res.status(404).json({
      success: false,
      message: "Bạn chưa đăng ký cửa hàng",
    });
  }

  const sellerId = req.user._id;
  const now = new Date();
  
  // Tính toán các mốc thời gian
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const eightDaysAgo = new Date(todayStart);
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
  
  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const thirtyOneDaysAgo = new Date(todayStart);
  thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

  // Doanh thu hôm nay
  const todayRevenueData = await Order.aggregate([
    {
      $match: {
        seller: sellerId,
        status: "delivered",
        paymentStatus: "paid",
        createdAt: { $gte: todayStart },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
      },
    },
  ]);
  const todayRevenue = todayRevenueData[0]?.totalRevenue || 0;

  // Doanh thu hôm qua
  const yesterdayRevenueData = await Order.aggregate([
    {
      $match: {
        seller: sellerId,
        status: "delivered",
        paymentStatus: "paid",
        createdAt: { $gte: yesterdayStart, $lt: todayStart },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
      },
    },
  ]);
  const yesterdayRevenue = yesterdayRevenueData[0]?.totalRevenue || 0;
  const todayRevenueChange = yesterdayRevenue > 0 
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
    : todayRevenue > 0 ? 100 : 0;

  // Doanh thu 7 ngày
  const sevenDaysRevenueData = await Order.aggregate([
    {
      $match: {
        seller: sellerId,
        status: "delivered",
        paymentStatus: "paid",
        createdAt: { $gte: sevenDaysAgo },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
      },
    },
  ]);
  const sevenDaysRevenue = sevenDaysRevenueData[0]?.totalRevenue || 0;

  // Doanh thu 7 ngày trước đó
  const previousSevenDaysRevenueData = await Order.aggregate([
    {
      $match: {
        seller: sellerId,
        status: "delivered",
        paymentStatus: "paid",
        createdAt: { $gte: eightDaysAgo, $lt: sevenDaysAgo },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
      },
    },
  ]);
  const previousSevenDaysRevenue = previousSevenDaysRevenueData[0]?.totalRevenue || 0;
  const sevenDaysRevenueChange = previousSevenDaysRevenue > 0
    ? ((sevenDaysRevenue - previousSevenDaysRevenue) / previousSevenDaysRevenue * 100).toFixed(1)
    : sevenDaysRevenue > 0 ? 100 : 0;

  // Doanh thu 30 ngày
  const thirtyDaysRevenueData = await Order.aggregate([
    {
      $match: {
        seller: sellerId,
        status: "delivered",
        paymentStatus: "paid",
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
      },
    },
  ]);
  const thirtyDaysRevenue = thirtyDaysRevenueData[0]?.totalRevenue || 0;

  // Doanh thu 30 ngày trước đó
  const previousThirtyDaysRevenueData = await Order.aggregate([
    {
      $match: {
        seller: sellerId,
        status: "delivered",
        paymentStatus: "paid",
        createdAt: { $gte: thirtyOneDaysAgo, $lt: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
      },
    },
  ]);
  const previousThirtyDaysRevenue = previousThirtyDaysRevenueData[0]?.totalRevenue || 0;
  const thirtyDaysRevenueChange = previousThirtyDaysRevenue > 0
    ? ((thirtyDaysRevenue - previousThirtyDaysRevenue) / previousThirtyDaysRevenue * 100).toFixed(1)
    : thirtyDaysRevenue > 0 ? 100 : 0;

  // Biểu đồ doanh thu 7 ngày qua
  const chartData = await Order.aggregate([
    {
      $match: {
        seller: sellerId,
        status: "delivered",
        paymentStatus: "paid",
        createdAt: { $gte: sevenDaysAgo },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        value: { $sum: "$totalAmount" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // Tạo dữ liệu biểu đồ với đầy đủ 7 ngày
  const daysOfWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const chartDataMap = new Map(chartData.map(item => [item._id, item.value]));
  const fullChartData = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(todayStart);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayIndex = date.getDay();
    const dayName = daysOfWeek[dayIndex === 0 ? 6 : dayIndex - 1];
    
    fullChartData.push({
      name: dayName,
      value: chartDataMap.get(dateStr) || 0,
    });
  }

  // Thống kê đơn hàng
  const totalOrders = await Order.countDocuments({ seller: sellerId });
  const pendingOrders = await Order.countDocuments({
    seller: sellerId,
    status: "pending",
  });
  const confirmedOrders = await Order.countDocuments({
    seller: sellerId,
    status: "confirmed",
  });
  const deliveredOrders = await Order.countDocuments({
    seller: sellerId,
    status: "delivered",
  });
  const cancelledOrders = await Order.countDocuments({
    seller: sellerId,
    status: { $in: ["cancelled", "rejected"] },
  });

  // Đơn hàng gần đây (5 đơn mới nhất)
  const recentOrders = await Order.find({ seller: sellerId })
    .populate("customer", "name email")
    .populate("items.product", "title images")
    .sort({ createdAt: -1 })
    .limit(5)
    .select("orderNumber items totalAmount status createdAt");

  // Sản phẩm
  const totalProducts = await Product.countDocuments({
    seller: sellerId,
  });
  const activeProducts = await Product.countDocuments({
    seller: sellerId,
    status: "active",
  });
  const outOfStockProducts = await Product.countDocuments({
    seller: sellerId,
    status: "active",
    stock: 0,
  });
  const pendingProducts = await Product.countDocuments({
    seller: sellerId,
    status: "pending",
  });
  const violationProducts = await Product.countDocuments({
    seller: sellerId,
    status: "violation",
  });

  res.status(200).json({
    success: true,
    data: {
      stats: {
        revenue: {
          today: todayRevenue,
          todayChange: parseFloat(todayRevenueChange),
          sevenDays: sevenDaysRevenue,
          sevenDaysChange: parseFloat(sevenDaysRevenueChange),
          thirtyDays: thirtyDaysRevenue,
          thirtyDaysChange: parseFloat(thirtyDaysRevenueChange),
          total: thirtyDaysRevenue,
        },
        chartData: fullChartData,
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          confirmed: confirmedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
        recentOrders: recentOrders.map(order => ({
          _id: order._id,
          orderNumber: order.orderNumber,
          items: order.items.map(item => ({
            productName: item.productName,
            productImage: item.productImage,
            quantity: item.quantity,
          })),
          totalAmount: order.totalAmount,
          status: order.status,
          createdAt: order.createdAt,
        })),
        products: {
          total: totalProducts,
          active: activeProducts,
          outOfStock: outOfStockProducts,
          pending: pendingProducts,
          violation: violationProducts,
        },
        rating: store.rating,
      },
    },
  });
});

