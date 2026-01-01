import * as categoryRepo from "../repositories/categoryRepo.js";
import * as productRepo from "../repositories/productRepo.js";
import { uploadImageToCloudinary } from "../config/cloudinary.js";

export const getAllCategoriesService = async () => {
    const categories = await categoryRepo.findAllCategories();
    return { success: true, data: categories };
};

export const createCategoryService = async (categoryData, file) => {
    if (categoryData.parentId) {
        const parentCategory = await categoryRepo.findCategoryById(categoryData.parentId);
        if (!parentCategory) {
            return { success: false, message: "Danh mục cha không tồn tại" };
        }
    }

    if (file) {
        const result = await uploadImageToCloudinary(file.buffer, "secondhand-marketplace/categories");
        categoryData.image = result.secure_url;
    }

    const newCategory = await categoryRepo.createCategoryInDB(categoryData);
    return { success: true, message: "Tạo danh mục thành công", data: newCategory };
};

export const updateCategoryService = async (categoryId, categoryData, file) => {
    const category = await categoryRepo.findCategoryById(categoryId);
    if (!category) {
        return { success: false, message: "Không tìm thấy danh mục" };
    }

    if (categoryData.parentId) {
        if(categoryData.parentId.toString() === categoryId.toString()){
            return { success: false, message: "Không thể tự làm danh mục cha của chính nó" };
        }
        const parentCategory = await categoryRepo.findCategoryById(categoryData.parentId);
        if (!parentCategory) {
            return { success: false, message: "Danh mục cha không tồn tại" };
        }
    }

    if (file) {
        const result = await uploadImageToCloudinary(file.buffer, "secondhand-marketplace/categories");
        categoryData.image = result.secure_url;
    }

    const updatedCategory = await categoryRepo.updateCategoryInDB(categoryId, categoryData);
    return { success: true, message: "Cập nhật danh mục thành công", data: updatedCategory };
};

export const disableCategoryService = async (categoryId) => {
    const category = await categoryRepo.findCategoryById(categoryId);
    if (!category) {
        return { success: false, message: "Không tìm thấy danh mục" };
    }
    if (!category.isActive) {
        const updatedCategory = await categoryRepo.updateCategoryInDB(categoryId, { isActive: true });
        return { success: true, message: "Mở danh mục thành công", data: updatedCategory };
    }
    const updatedCategory = await categoryRepo.updateCategoryInDB(categoryId, { isActive: false });
    return { success: true, message: "Vô hiệu hóa danh mục thành công", data: updatedCategory };
};

export const getAdminCategoriesService = async (filters, options) => {
  const result = await categoryRepo.findAdminCategories(filters, options);
  if (!result) {
    return { success: false, message: "Không tìm thấy danh mục" };
  }
  return { success: true, data: result };
};

export const getAdminCategoryByIdService = async (categoryId) => {
  const category = await categoryRepo.findCategoryById(categoryId);
  if (!category) {
    return { success: false, message: "Không tìm thấy danh mục" };
  }

  return { success: true, data: category };
};

export const getParentCategoriesService = async () => {
    const categories = await categoryRepo.findParentCategories();
    return { success: true, data: categories };
};

