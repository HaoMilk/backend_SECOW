import {
  createProductInDB,
  findProductById,
  updateProductInDB,
} from "../repositories/productRepo.js";

export const createProductService = async (data, user) => {
  const {
    title,
    description,
    price,
    images,
    condition,
    categoryId,
    location,
    stock,
    attributes,
    video,
    originalPrice,
    brand,
    weight,
  } = data;

  const newProductData = {
    title,
    description,
    price,
    images: images || [],
    condition: condition || "Good",
    categoryId,
    location,
    seller: user._id,
    stock: stock || 1,
    attributes,
    video,
    originalPrice,
    brand,
    weight,
    status: "pending",
  };

  const product = await createProductInDB(newProductData);

  const formattedProduct = {
    id: product._id.toString(),
    title: product.title,
    priceText: new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(product.price),
    price: product.price,
    imageUrl:
      product.images && product.images.length > 0
        ? product.images[0]
        : "https://placehold.co/400x300",
    condition: product.condition,
    sellerName: user.name,
    location: product.location,
    categoryId: product.categoryId,
    status: product.status,
  };

  return formattedProduct;
};

export const updateProductService = async (productId, productData, user) => {
  const product = await findProductById(productId);

  if (!product) {
    return { success: false, message: "Sản phẩm không tồn tại" };
  }

  if (product.seller.toString() !== user._id.toString()) {
    return { success: false, message: "Bạn không có quyền cập nhật sản phẩm này" };
  }

  const updatedProduct = await updateProductInDB(productId, productData);

  return { success: true, message: "Cập nhật sản phẩm thành công", data: updatedProduct };
};

export const updateProductStatusService = async (productId, status, violationReason, user) => {
    const product = await findProductById(productId);

    if (!product) {
        return { success: false, message: "Sản phẩm không tồn tại" };
    }

    const updateData = { status };

    if (status === "violation" && violationReason) {
        updateData.violationReason = violationReason;
    }
    
    // Seller can only hide their own products
    if(status === 'hidden' && product.seller.toString() !== user._id.toString() && user.role !== 'admin'){
        return { success: false, message: "Bạn không có quyền ẩn sản phẩm này" };
    }

    if(status !== 'hidden' && user.role !== 'admin'){
        return { success: false, message: "Chỉ quản trị viên mới có quyền cập nhật trạng thái sản phẩm" };
    }

    const updatedProduct = await updateProductInDB(productId, updateData);

    return { success: true, message: "Cập nhật trạng thái sản phẩm thành công", data: updatedProduct };
}