import Product from "../models/Product.js";
export const createProductInDB = async (productData) => {
  return await Product.create(productData);
};

export const findProductById = async (productId) => {
  return await Product.findById(productId);
}

export const updateProductInDB = async (productId, productData) => {
  return await Product.findByIdAndUpdate(productId, productData, { new: true, runValidators: true });
};