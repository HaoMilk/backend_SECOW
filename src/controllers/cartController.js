import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import asyncHandler from "../middleware/asyncHandler.js";

// @desc    Lấy giỏ hàng của user
// @route   GET /api/v1/cart
// @access  Private
export const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product",
    "title price images condition stock status seller"
  );

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  // Lọc các sản phẩm không còn active hoặc đã bị xóa
  const validItems = cart.items.filter(
    (item) => item.product && item.product.status === "active" && item.product.stock > 0
  );

  // Cập nhật lại cart nếu có items không hợp lệ
  if (validItems.length !== cart.items.length) {
    cart.items = validItems;
    await cart.save();
  }

  // Tính tổng tiền
  const total = validItems.reduce((sum, item) => {
    return sum + item.product.price * item.quantity;
  }, 0);

  res.status(200).json({
    success: true,
    data: {
      cart: {
        id: cart._id,
        items: validItems.map((item) => ({
          id: item._id,
          product: {
            id: item.product._id,
            title: item.product.title,
            price: item.product.price,
            image: item.product.images?.[0] || null,
            condition: item.product.condition,
            stock: item.product.stock,
          },
          quantity: item.quantity,
          subtotal: item.product.price * item.quantity,
        })),
        total,
        itemCount: validItems.length,
      },
    },
  });
});

// @desc    Thêm sản phẩm vào giỏ hàng
// @route   POST /api/v1/cart/items
// @access  Private
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  // Kiểm tra sản phẩm
  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy sản phẩm",
    });
  }

  if (product.status !== "active") {
    return res.status(400).json({
      success: false,
      message: "Sản phẩm không khả dụng",
    });
  }

  if (product.stock < quantity) {
    return res.status(400).json({
      success: false,
      message: "Số lượng sản phẩm không đủ",
    });
  }

  // Không cho phép mua sản phẩm của chính mình
  if (product.seller.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: "Bạn không thể mua sản phẩm của chính mình",
    });
  }

  // Tìm hoặc tạo cart
  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  // Kiểm tra sản phẩm đã có trong giỏ hàng chưa
  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (existingItemIndex > -1) {
    // Cập nhật số lượng
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    if (newQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: "Số lượng sản phẩm không đủ",
      });
    }
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Thêm mới
    cart.items.push({ product: productId, quantity });
  }

  await cart.save();

  await cart.populate("items.product", "title price images condition stock");

  res.status(200).json({
    success: true,
    message: "Đã thêm vào giỏ hàng",
    data: {
      cart,
    },
  });
});

// @desc    Cập nhật số lượng sản phẩm trong giỏ hàng
// @route   PUT /api/v1/cart/items/:itemId
// @access  Private
export const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (quantity < 1) {
    return res.status(400).json({
      success: false,
      message: "Số lượng phải lớn hơn 0",
    });
  }

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy giỏ hàng",
    });
  }

  const item = cart.items.id(itemId);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy sản phẩm trong giỏ hàng",
    });
  }

  // Kiểm tra stock
  const product = await Product.findById(item.product);
  if (product.stock < quantity) {
    return res.status(400).json({
      success: false,
      message: "Số lượng sản phẩm không đủ",
    });
  }

  item.quantity = quantity;
  await cart.save();

  res.status(200).json({
    success: true,
    message: "Cập nhật giỏ hàng thành công",
    data: {
      cart,
    },
  });
});

// @desc    Xóa sản phẩm khỏi giỏ hàng
// @route   DELETE /api/v1/cart/items/:itemId
// @access  Private
export const removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy giỏ hàng",
    });
  }

  cart.items = cart.items.filter(
    (item) => item._id.toString() !== itemId
  );

  await cart.save();

  res.status(200).json({
    success: true,
    message: "Đã xóa sản phẩm khỏi giỏ hàng",
    data: {
      cart,
    },
  });
});

// @desc    Xóa toàn bộ giỏ hàng
// @route   DELETE /api/v1/cart
// @access  Private
export const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (cart) {
    cart.items = [];
    await cart.save();
  }

  res.status(200).json({
    success: true,
    message: "Đã xóa toàn bộ giỏ hàng",
  });
});

