import Product from "../models/Product.js";
import asyncHandler from "../middleware/asyncHandler.js";
import * as productService from "../services/productService.js";

export const createProduct = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "seller") {
    return res.status(403).json({
      success: false,
      message: "Chỉ người bán mới có thể tạo sản phẩm",
    });
  }

  const formattedProduct = await productService.createProductService(
    req.body,
    req.user
  );

  res.status(201).json({
    success: true,
    message: "Tạo sản phẩm thành công",
    data: {
      product: formattedProduct,
    },
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const result = await productService.updateProductService(
    req.params.id,
    req.body,
    req.user
  );

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.status(200).json(result);
});

export const hideProduct = asyncHandler(async (req, res) => {
  const result = await productService.updateProductStatusService(
    req.params.id,
    "hidden",
    null,
    req.user
  );

  if (!result.success) {
    return res.status(404).json(result);
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
  const { reason } = req.body;
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
