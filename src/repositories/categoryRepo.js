import Category from "../models/Category.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";

export const findAllCategories = async () => {
  return await Category.find({ isActive: true }).populate("parentId", "name").sort({ createdAt: -1 });
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

export const findAdminCategories = async (filters, options) => {
  const { name, isActive, sortBy } = filters;
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;

  let globalQuery = {};
  if (name) globalQuery.name = { $regex: name, $options: "i" };
  if (isActive !== undefined) globalQuery.isActive = isActive === 'true';

  const totalAllCategories = await Category.countDocuments(globalQuery);

  let parentQuery = { ...globalQuery };
  if (!name) {
    parentQuery.parentId = null;
  }

  const totalRootCategories = await Category.countDocuments(parentQuery);
  const totalPages = Math.ceil(totalRootCategories / limit);
  const skip = (page - 1) * limit;

  let sortOption = {};
  if (sortBy === "productCount_asc") {
    sortOption = { productCount: 1 };
  } else if (sortBy === "productCount_desc") {
    sortOption = { productCount: -1 };
  } else {
    sortOption = { createdAt: -1 };
  }

  const parentCategories = await Category.find(parentQuery)
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .lean();

  const parentIds = parentCategories.map(p => p._id);

  let children = [];
  if (!name) {
    let childrenQuery = { parentId: { $in: parentIds } };
    if (isActive !== undefined) {
      childrenQuery.isActive = isActive === 'true';
    }
    children = await Category.find(childrenQuery).lean();
  }

  const allDisplayCategoryIds = [...parentIds, ...children.map(c => c._id)];

  const productCounts = await Product.aggregate([
    { $match: { categoryId: { $in: allDisplayCategoryIds } } },
    { $group: { _id: "$categoryId", count: { $sum: 1 } } },
  ]);

  const categoryProductCounts = productCounts.reduce((acc, item) => {
    acc[item._id.toString()] = item.count;
    return acc;
  }, {});

  const childrenMap = {};
  children.forEach(child => {
    child.productCount = categoryProductCounts[child._id.toString()] || 0;
    const parentId = child.parentId.toString();
    if (!childrenMap[parentId]) {
      childrenMap[parentId] = [];
    }
    childrenMap[parentId].push(child);
  });

  parentCategories.forEach(parent => {
    parent.productCount = categoryProductCounts[parent._id.toString()] || 0;
    parent.children = !name ? (childrenMap[parent._id.toString()] || []) : [];
  });

  const totalPageItems = parentCategories.length + children.length;

  return {
    categories: parentCategories,
    totalCategories: totalAllCategories,
    totalPages,
    currentPage: page,
    totalPageItems,
  };
};

export const findParentCategories = async () => {
  return await Category.find({ parentId: null });
};
