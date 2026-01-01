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
export const deleteProductFromDB = async (productId) => {
  return await Product.findByIdAndDelete(productId);
};

export const findProductsBySeller = async (sellerId, filters, options) => {
  const { page = 1, limit = 10 } = options;
  const { status, name, categoryId, sortBy } = filters;
  
  const query = { seller: sellerId };

  if (status) {
    query.status = status;
  }

  if (name) {
    query.title = { $regex: name, $options: "i" };
  }

  if (categoryId) {
    query.categoryId = categoryId;
  }

  let sort = { createdAt: -1 }; 
  
  if (sortBy) {
    if (sortBy.includes(':')) {
      const [field, order] = sortBy.split(':');
      sort = { [field]: order === 'asc' ? 1 : -1 };
    } 
    else if (sortBy === "price_asc") sort = { price: 1 };
    else if (sortBy === "price_desc") sort = { price: -1 };
  }

  const skip = (page - 1) * limit;
  const rawProducts = await Product.find(query)
    .populate("categoryId", "name") 
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .lean(); 
  const products = rawProducts.map(product => ({
    ...product,
    category: product.categoryId, 
    categoryId: undefined
  }));
  const totalProducts = await Product.countDocuments(query);
  const totalPages = Math.ceil(totalProducts / limit);

  return {
    products, 
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalProducts, 
      totalPages: totalPages
    }
  };
};
export const findAdminProducts = async (filters, options) => {
  const { page = 1, limit = 10 } = options;
  const { status, name, sortBy } = filters;

  const query = {};

  if (status && status !== "all") {
    query.status = status;
  }

  if (name) {
    query.$or = [
      { title: { $regex: name, $options: "i" } },
    ];
  }

  let sort = { createdAt: -1 };

  if (sortBy) {
    if (sortBy.includes(':')) {
      const [field, order] = sortBy.split(':');
      sort = { [field]: order === 'asc' ? 1 : -1 };
    } 
    else if (sortBy === "price_asc") sort = { price: 1 };
    else if (sortBy === "price_desc") sort = { price: -1 };
  }

  const skip = (page - 1) * limit;
  const rawProducts = await Product.find(query)
    .populate("categoryId", "name")
    .populate("seller", "storeName logo")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const products = rawProducts.map(product => ({
    ...product,
    category: product.categoryId,
    categoryId: undefined
  }));

  const totalProducts = await Product.countDocuments(query);
  const totalPages = Math.ceil(totalProducts / limit);

  return {
    products,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalProducts,
      totalPages: totalPages
    }
  };
};

export const getProductCountByCategoryId = async (categoryId) => {
  return await Product.countDocuments({ categoryId });
};