import asyncHandler from "../middleware/asyncHandler.js";
import * as categoryService from "../services/categoryService.js";

export const getCategories = asyncHandler(async (req, res) => {
  const result = await categoryService.getAllCategoriesService();
  res.status(200).json(result);
});

export const createCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.createCategoryService(req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.status(201).json(result);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.updateCategoryService(
    req.params.id,
    req.body
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
