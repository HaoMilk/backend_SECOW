import Store from "../models/Store.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import asyncHandler from "../middleware/asyncHandler.js";

// @desc    Đăng ký trở thành người bán
// @route   POST /api/v1/stores/register
// @access  Private
export const registerStore = asyncHandler(async (req, res) => {
  const { storeName, description, address, phone, email } = req.body;

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

  // Thống kê đơn hàng
  const totalOrders = await Order.countDocuments({ seller: req.user._id });
  const pendingOrders = await Order.countDocuments({
    seller: req.user._id,
    status: "pending",
  });
  const confirmedOrders = await Order.countDocuments({
    seller: req.user._id,
    status: "confirmed",
  });
  const deliveredOrders = await Order.countDocuments({
    seller: req.user._id,
    status: "delivered",
  });

  // Doanh thu
  const revenueData = await Order.aggregate([
    {
      $match: {
        seller: req.user._id,
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
  const orderCount = revenueData[0]?.orderCount || 0;

  // Sản phẩm
  const totalProducts = await Product.countDocuments({
    seller: req.user._id,
  });
  const activeProducts = await Product.countDocuments({
    seller: req.user._id,
    status: "active",
  });

  res.status(200).json({
    success: true,
    data: {
      stats: {
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          confirmed: confirmedOrders,
          delivered: deliveredOrders,
        },
        revenue: {
          total: totalRevenue,
          orderCount,
        },
        products: {
          total: totalProducts,
          active: activeProducts,
        },
        rating: store.rating,
      },
    },
  });
});

