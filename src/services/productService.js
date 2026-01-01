import {
  createProductInDB,
  findProductById,
  updateProductInDB,
  findProductsBySeller,
  deleteProductFromDB,
  findAdminProducts,
} from "../repositories/productRepo.js";
import {
  uploadImageToCloudinary,
  uploadVideoToCloudinary,
} from "../config/cloudinary.js";

export const createProductService = async (data, files, user) => {
  const {
    title,
    description,
    price,
    condition,
    categoryId,
    stock,
    originalPrice,
    brand,
    weight,
    location,
    attributes,
  } = data;
  let parsedLocation;
  let parsedAttributes;

  try {
    parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
    parsedAttributes = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
  } catch (error) {
    return { success: false, message: "Lỗi định dạng dữ liệu (Location hoặc Attributes không phải JSON hợp lệ)" };
  }

  let imageUrls = [];
  if (files && files.images && files.images.length > 0) {
    const uploadPromises = files.images.map(file => uploadImageToCloudinary(file.buffer));
    const results = await Promise.all(uploadPromises);
    imageUrls = results.map(result => result.secure_url);
  }

  let videoUrl = '';
  if (files && files.video && files.video.length > 0) {
    const result = await uploadVideoToCloudinary(files.video[0].buffer);
    videoUrl = result.secure_url;
  }

  const newProductData = {
    title,
    description,
    price: Number(price),
    originalPrice: originalPrice ? Number(originalPrice) : 0,


    stock: stock ? Number(stock) : 1,
    weight: weight ? Number(weight) : 0,
    brand,
    condition: condition || "Good",
    categoryId,

    location: parsedLocation,
    attributes: parsedAttributes,

    images: imageUrls,
    video: videoUrl,

    seller: user._id,
    status: "pending",
    views: 0,
  };
  const savedProduct = await createProductInDB(newProductData);
  return {
    success: true,
    message: "Đăng sản phẩm thành công, vui lòng chờ duyệt!",
    data: savedProduct
  };
};

export const updateProductService = async (productId, productData, files, user) => {
  const product = await findProductById(productId);

  if (!product) {
    return { success: false, message: "Sản phẩm không tồn tại" };
  }

  if (product.seller.toString() !== user._id.toString()) {
    return { success: false, message: "Bạn không có quyền cập nhật sản phẩm này" };
  }

  let parsedLocation = productData.location;
  let parsedAttributes = productData.attributes;

  try {
    if (typeof productData.location === 'string') {
      parsedLocation = JSON.parse(productData.location);
    }
    if (typeof productData.attributes === 'string') {
      parsedAttributes = JSON.parse(productData.attributes);
    }
  } catch (error) {
    return { success: false, message: "Lỗi định dạng dữ liệu JSON (Location hoặc Attributes)" };
  }
  let finalImages = [];

  if (productData.existingImages) {
    if (Array.isArray(productData.existingImages)) {
      finalImages = [...productData.existingImages];
    } else {
      finalImages = [productData.existingImages];
    }
  }

  if (files && files.images && files.images.length > 0) {
    const uploadPromises = files.images.map(file => uploadImageToCloudinary(file.buffer));
    const results = await Promise.all(uploadPromises);
    const newImageUrls = results.map(result => result.secure_url);
    finalImages = [...finalImages, ...newImageUrls];
  }

  if (finalImages.length > 5) {
    return { success: false, message: "Tổng số ảnh không được vượt quá 5" };
  }
  if (finalImages.length === 0) {
    return { success: false, message: "Sản phẩm phải có ít nhất 1 ảnh" };
  }

  let videoUrl = product.video;
  if (files && files.video && files.video.length > 0) {
    const result = await uploadVideoToCloudinary(files.video[0].buffer);
    videoUrl = result.secure_url;
  }
  const updateData = {
    ...productData,
    price: Number(productData.price),
    originalPrice: productData.originalPrice ? Number(productData.originalPrice) : 0,
    stock: Number(productData.stock),
    weight: Number(productData.weight),

    location: parsedLocation,
    attributes: parsedAttributes,
    images: finalImages,
    video: videoUrl,
  };

  delete updateData.seller;
  delete updateData._id;
  delete updateData.existingImages;

  const updatedProduct = await updateProductInDB(productId, updateData);

  return { success: true, message: "Cập nhật sản phẩm thành công", data: updatedProduct };
};

export const updateProductStatusService = async (productId, status, violationReason, user) => {
  const product = await findProductById(productId);

  if (!product) {
    return { success: false, message: "Sản phẩm không tồn tại" };
  }

  const updateData = { status };
  if (status === 'pending' || product.status === 'violation') {
    return {
      success: false,
      message: "Sản phẩm chưa được duyệt hoặc đang bị khóa, bạn không thể thay đổi trạng thái hiển thị."
    };
  }
  if (status === "violation" && violationReason) {
    updateData.violationReason = violationReason;
  }

  if (status === 'hidden' && product.seller.toString() !== user._id.toString() && user.role !== 'admin') {
    return { success: false, message: "Bạn không có quyền ẩn sản phẩm này" };
  }


  const updatedProduct = await updateProductInDB(productId, updateData);

  return { success: true, message: "Cập nhật trạng thái sản phẩm thành công", data: updatedProduct };
}
export const deleteProductService = async (productId, user) => {
  const product = await findProductById(productId);

  if (!product) {
    return { success: false, message: "Sản phẩm không tồn tại" };
  }

  const isOwner = product.seller.toString() === user._id.toString();

  // Seller chỉ được xóa sản phẩm của mình, admin xóa tất cả
  if (!isOwner && user.role !== "admin") {
    return { success: false, message: "Bạn không có quyền xóa sản phẩm này" };
  }

  await deleteProductFromDB(productId);

  return {
    success: true,
    message: "Đã xóa sản phẩm khỏi hệ thống"
  };
};
export const getProductsBySellerService = async (sellerId, filters, options) => {
  const { products, pagination } = await findProductsBySeller(sellerId, filters, options);

  if (!products) {
    return { success: false, message: "Không tìm thấy sản phẩm" };
  }

  return { success: true, data: { products, pagination } };
};
export const getAdminProductsService = async (filters, options) => {
  const { products, pagination } = await findAdminProducts(filters, options);

  if (!products) {
    return { success: false, message: "Không tìm thấy sản phẩm" };
  }

  return { success: true, data: { products, pagination } };
};