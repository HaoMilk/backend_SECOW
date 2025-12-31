import Category from "../models/Category.js";
import asyncHandler from "../middleware/asyncHandler.js";

// @desc    Lấy tất cả danh mục
// @route   GET /api/v1/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .sort({ order: 1, createdAt: -1 })
    .select("-__v");

  res.status(200).json({
    success: true,
    data: {
      categories,
    },
  });
});

// @desc    Lấy danh mục theo ID
// @route   GET /api/v1/categories/:id
// @access  Public
export const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy danh mục",
    });
  }

  res.status(200).json({
    success: true,
    data: {
      category,
    },
  });
});

// @desc    Tạo danh mục mới
// @route   POST /api/v1/categories
// @access  Admin
export const createCategory = asyncHandler(async (req, res) => {
  const { name, slug, description, image, order } = req.body;

  // Tạo slug từ name nếu không có
  let categorySlug = slug || name.toLowerCase().replace(/\s+/g, "-");

  const category = await Category.create({
    name,
    slug: categorySlug,
    description,
    image,
    order: order || 0,
  });

  res.status(201).json({
    success: true,
    message: "Tạo danh mục thành công",
    data: {
      category,
    },
  });
});

// @desc    Cập nhật danh mục
// @route   PUT /api/v1/categories/:id
// @access  Admin
export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const category = await Category.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy danh mục",
    });
  }

  res.status(200).json({
    success: true,
    message: "Cập nhật danh mục thành công",
    data: {
      category,
    },
  });
});

// @desc    Xóa danh mục
// @route   DELETE /api/v1/categories/:id
// @access  Admin
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy danh mục",
    });
  }

  // Soft delete - chỉ đánh dấu không active
  category.isActive = false;
  await category.save();

  res.status(200).json({
    success: true,
    message: "Xóa danh mục thành công",
  });
});

