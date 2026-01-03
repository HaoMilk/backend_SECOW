import asyncHandler from "../middleware/asyncHandler.js";
import * as productService from "../services/productService.js";

export const createProduct = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "seller") {
    return res.status(403).json({
      success: false,
      message: "Chỉ người bán mới có thể tạo sản phẩm",
    });
  }

  const result = await productService.createProductService(
    req.body,
    req.files,
    req.user
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.status(201).json(result);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const result = await productService.updateProductService(
    req.params.id,
    req.body,
    req.files,
    req.user
  );

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.status(200).json(result);
});

export const hideProduct = asyncHandler(async (req, res) => {
  console.log(req.params.status);  
  const result = await productService.updateProductStatusService(
    req.params.id,
    req.body.status,
    null,
    req.user
  );

  if (!result.success) {
    return res.status(403).json(result);
  }

  res.status(200).json(result);
});
export const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.deleteProductService(
    req.params.id,
    req.user
  );

  if (!result.success) {
    return res.status(403).json(result);
  }

  res.status(200).json(result);
});

export const approveProduct = asyncHandler(async (req, res) => {
  const result = await productService.updateProductStatusService(
    req.params.id,
    "active",
    null,
    req.user
  );

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.status(200).json(result);
});

export const rejectProduct = asyncHandler(async (req, res) => {

  const { violationReason: reason } = req.body;
  if (!reason) {
    return res
      .status(400)
      .json({ success: false, message: "Lý do từ chối là bắt buộc" });
  }

  const result = await productService.updateProductStatusService(
    req.params.id,
    "violation",
    reason,
    req.user
  );

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.status(200).json(result);
});

export const getProductsBySeller = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;
  const { status, name, categoryId, sortBy, page = 1, limit = 10 } = req.query;

  const result = await productService.getProductsBySellerService(
    sellerId,
    { status, name, categoryId, sortBy },
    { page, limit }
  );

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.status(200).json(result);
});
export const getAdminProducts = asyncHandler(async (req, res) => {
  const { page, limit, status, search, sortBy } = req.query;

  const filters = {
    status,
    name: search, 
    sortBy
  };

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10
  };

  const result = await productService.getAdminProductsService(filters, options);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.status(200).json(result);
});
