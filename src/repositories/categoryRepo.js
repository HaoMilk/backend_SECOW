import Category from "../models/Category.js";

export const findAllCategories = async () => {
  return await Category.find().populate("parentId", "name").sort({ createdAt: -1 });
};

export const createCategoryInDB = async (categoryData) => {
  return await Category.create(categoryData);
};

export const findCategoryById = async (categoryId) => {
  return await Category.findById(categoryId);
};

export const updateCategoryInDB = async (categoryId, categoryData) => {
  return await Category.findByIdAndUpdate(categoryId, categoryData, {
    new: true,
    runValidators: true,
  });
};
