import Category from "../models/Category.js";
import Product from "../models/Product.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { uploadToCloudinary, uploadFromUrl } from "../config/cloudinary.js";

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
  const { name, slug, description, image, order, parentId, isActive } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Tên danh mục là bắt buộc",
    });
  }

  // Tạo slug từ name nếu không có
  let categorySlug = slug || name.toLowerCase().replace(/\s+/g, "-");

  // Upload image nếu có file hoặc URL
  let imageUrl = null;
  
  // Priority 1: Upload file nếu có
  if (req.files && req.files.image && req.files.image.length > 0) {
    try {
      const file = req.files.image[0];
      const result = await uploadToCloudinary(
        file.buffer,
        "secondhand-marketplace/categories",
        "image"
      );
      imageUrl = result.secure_url;
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Lỗi khi upload ảnh: ${error.message || "Unknown error"}`,
      });
    }
  }
  // Priority 2: Upload từ URL nếu có và không phải là URL Cloudinary đã tồn tại
  else if (image && typeof image === "string") {
    const isCloudinaryUrl = image.includes("cloudinary.com");
    const isHttpUrl = image.startsWith("http://") || image.startsWith("https://");
    
    if (isHttpUrl && !isCloudinaryUrl) {
      // Upload URL lên Cloudinary vào folder categories
      try {
        const result = await uploadFromUrl(image, "secondhand-marketplace/categories");
        imageUrl = result.secure_url;
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: `Lỗi khi upload ảnh từ URL: ${error.message || "Unknown error"}`,
        });
      }
    } else if (isCloudinaryUrl) {
      // Nếu đã là URL Cloudinary thì giữ nguyên
      imageUrl = image;
    } else {
      // Nếu không phải URL hợp lệ thì dùng giá trị đó (có thể là base64 hoặc path)
      imageUrl = image;
    }
  }

  // Validate parentId nếu có
  if (parentId) {
    const parentCategory = await Category.findById(parentId);
    if (!parentCategory) {
      return res.status(400).json({
        success: false,
        message: "Danh mục cha không tồn tại",
      });
    }
  }

  const categoryData = {
    name,
    slug: categorySlug,
    description,
    order: order || 0,
    parentId: parentId || null,
    isActive: isActive !== undefined ? isActive : true,
  };

  // Chỉ thêm image nếu có
  if (imageUrl) {
    categoryData.image = imageUrl;
  }

  const category = await Category.create(categoryData);

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
  const { name, slug, description, image, order, parentId, isActive } = req.body;

  const category = await Category.findById(id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy danh mục",
    });
  }

  // Upload image nếu có file mới hoặc URL mới
  let imageUrl = undefined; // undefined = không thay đổi, null = xóa, string = cập nhật
  
  // Priority 1: Upload file nếu có
  if (req.files && req.files.image && req.files.image.length > 0) {
    try {
      const file = req.files.image[0];
      const result = await uploadToCloudinary(
        file.buffer,
        "secondhand-marketplace/categories",
        "image"
      );
      imageUrl = result.secure_url;
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Lỗi khi upload ảnh: ${error.message || "Unknown error"}`,
      });
    }
  }
  // Priority 2: Xử lý URL nếu có
  else if (image !== undefined && image !== null && typeof image === "string") {
    // Nếu image giống với ảnh hiện tại thì không cần cập nhật
    if (image === category.image) {
      imageUrl = undefined; // Không thay đổi
    } else {
      const isCloudinaryUrl = image.includes("cloudinary.com");
      const isHttpUrl = image.startsWith("http://") || image.startsWith("https://");
      
      if (isHttpUrl && !isCloudinaryUrl) {
        // Upload URL lên Cloudinary vào folder categories
        try {
          const result = await uploadFromUrl(image, "secondhand-marketplace/categories");
          imageUrl = result.secure_url;
        } catch (error) {
          return res.status(500).json({
            success: false,
            message: `Lỗi khi upload ảnh từ URL: ${error.message || "Unknown error"}`,
          });
        }
      } else if (isCloudinaryUrl || isHttpUrl) {
        // Nếu đã là URL Cloudinary hoặc HTTP hợp lệ thì dùng trực tiếp
        imageUrl = image;
      } else {
        // Nếu không phải URL hợp lệ thì dùng giá trị đó
        imageUrl = image;
      }
    }
  } else if (image === null || image === "") {
    // Nếu image là null hoặc empty string thì xóa ảnh
    imageUrl = null;
  }

  // Validate parentId nếu có và không được là chính nó
  if (parentId !== undefined) {
    if (parentId === id) {
      return res.status(400).json({
        success: false,
        message: "Danh mục không thể là cha của chính nó",
      });
    }
    if (parentId) {
      const parentCategory = await Category.findById(parentId);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: "Danh mục cha không tồn tại",
        });
      }
    }
  }

  // Cập nhật các trường
  if (name) category.name = name;
  if (slug) category.slug = slug;
  if (description !== undefined) category.description = description;
  // Chỉ cập nhật image nếu imageUrl được set (undefined = không thay đổi, null = xóa, string = cập nhật)
  if (imageUrl !== undefined) {
    category.image = imageUrl;
  }
  if (order !== undefined) category.order = order;
  if (parentId !== undefined) category.parentId = parentId || null;
  if (isActive !== undefined) category.isActive = isActive;

  // Tạo slug từ name nếu name thay đổi và không có slug
  if (name && !slug) {
    category.slug = name.toLowerCase().replace(/\s+/g, "-");
  }

  await category.save();

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

// @desc    Lấy danh sách danh mục cho admin (có pagination và tree structure)
// @route   GET /api/v1/categories/admin
// @access  Admin
export const getCategoriesForAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  // Lấy tất cả categories (bao gồm cả inactive)
  const allCategories = await Category.find({})
    .sort({ order: 1, createdAt: -1 })
    .select("-__v")
    .lean();

  // Đếm số sản phẩm cho mỗi category
  const categoryIds = allCategories.map((cat) => cat._id.toString());
  const productCounts = await Product.aggregate([
    {
      $match: {
        categoryId: { $in: categoryIds },
      },
    },
    {
      $group: {
        _id: "$categoryId",
        count: { $sum: 1 },
      },
    },
  ]);

  // Tạo map để tra cứu nhanh productCount
  const productCountMap = {};
  productCounts.forEach((item) => {
    productCountMap[item._id] = item.count;
  });

  // Thêm productCount vào mỗi category
  const categoriesWithCount = allCategories.map((cat) => ({
    ...cat,
    productCount: productCountMap[cat._id.toString()] || 0,
  }));

  // Xây dựng cấu trúc tree
  const buildTree = (categories, parentId = null) => {
    return categories
      .filter((cat) => {
        const catParentId = cat.parentId
          ? cat.parentId.toString()
          : null;
        return catParentId === parentId;
      })
      .map((cat) => ({
        ...cat,
        children: buildTree(categories, cat._id.toString()),
      }));
  };

  const treeCategories = buildTree(categoriesWithCount);

  // Tính toán pagination cho root categories
  const rootCategories = categoriesWithCount.filter(
    (cat) => !cat.parentId
  );
  const totalCategories = rootCategories.length;
  const totalPages = Math.ceil(totalCategories / limitNum);
  const skip = (pageNum - 1) * limitNum;
  const paginatedRootCategories = rootCategories.slice(
    skip,
    skip + limitNum
  );

  // Xây dựng tree cho các root categories đã paginate
  const paginatedTree = paginatedRootCategories.map((rootCat) => {
    const children = buildTree(categoriesWithCount, rootCat._id.toString());
    return {
      ...rootCat,
      children,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      categories: paginatedTree,
      currentPage: pageNum,
      totalPages,
      totalCategories,
      totalPageItems: paginatedTree.length,
    },
  });
});

// @desc    Lấy danh sách danh mục cha (không có parent)
// @route   GET /api/v1/categories/parents
// @access  Public
export const getParentCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({
    parentId: null,
    isActive: true,
  })
    .sort({ order: 1, createdAt: -1 })
    .select("-__v");

  res.status(200).json({
    success: true,
    data: categories,
  });
});

// @desc    Toggle trạng thái active/inactive của danh mục
// @route   PATCH /api/v1/categories/:id/disable
// @access  Admin
export const disableCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy danh mục",
    });
  }

  // Toggle isActive
  category.isActive = !category.isActive;
  await category.save();

  res.status(200).json({
    success: true,
    message: category.isActive
      ? "Đã kích hoạt danh mục"
      : "Đã vô hiệu hóa danh mục",
    data: {
      category,
    },
  });
});

