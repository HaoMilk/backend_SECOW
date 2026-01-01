import asyncHandler from "../middleware/asyncHandler.js";
import * as categoryService from "../services/categoryService.js";

export const getCategories = asyncHandler(async (req, res) => {
  const result = await categoryService.getAllCategoriesService();
  res.status(200).json(result);
});

export const createCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.createCategoryService(req.body, req.file);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.status(201).json(result);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.updateCategoryService(
    req.params.id,
    req.body,
    req.file
  );
  if (!result.success) {
    return res.status(404).json(result);
  }
  res.status(200).json(result);
});

export const disableCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.disableCategoryService(req.params.id);
  if (!result.success) {
    return res.status(404).json(result);
  }
  res.status(200).json(result);
});

export const getAdminCategories = asyncHandler(async (req, res) => {
  const {
    name,
    isActive,
    sortBy,
    page,
    limit,
  } = req.query;

  const filters = { name, isActive, sortBy };
  const options = { page, limit };

  const result = await categoryService.getAdminCategoriesService(filters, options);

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.status(200).json(result);
});

export const getAdminCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await categoryService.getAdminCategoryByIdService(id);

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.status(200).json(result);
});

export const getParentCategories = asyncHandler(async (req, res) => {
  const result = await categoryService.getParentCategoriesService();
  res.status(200).json(result);
});
