import * as categoryRepo from "../repositories/categoryRepo.js";

export const getAllCategoriesService = async () => {
    const categories = await categoryRepo.findAllCategories();
    return { success: true, data: categories };
};

export const createCategoryService = async (categoryData) => {
    if (categoryData.parentId) {
        const parentCategory = await categoryRepo.findCategoryById(categoryData.parentId);
        if (!parentCategory) {
            return { success: false, message: "Danh mục cha không tồn tại" };
        }
    }
    const newCategory = await categoryRepo.createCategoryInDB(categoryData);
    return { success: true, message: "Tạo danh mục thành công", data: newCategory };
};

export const updateCategoryService = async (categoryId, categoryData) => {
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

    const updatedCategory = await categoryRepo.updateCategoryInDB(categoryId, categoryData);
    return { success: true, message: "Cập nhật danh mục thành công", data: updatedCategory };
};

export const disableCategoryService = async (categoryId) => {
    const category = await categoryRepo.findCategoryById(categoryId);
    if (!category) {
        return { success: false, message: "Không tìm thấy danh mục" };
    }

    const updatedCategory = await categoryRepo.updateCategoryInDB(categoryId, { isActive: false });
    return { success: true, message: "Vô hiệu hóa danh mục thành công", data: updatedCategory };
};
