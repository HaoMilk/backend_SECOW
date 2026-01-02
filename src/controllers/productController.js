import Product from '../models/Product.js'
import asyncHandler from '../middleware/asyncHandler.js'

// Lấy danh sách sản phẩm với filter và pagination
export const getProducts = asyncHandler(async (req, res) => {
	const {
		page = 1,
		limit = 12,
		categoryId,
		location,
		condition,
		minPrice,
		maxPrice,
		sortBy = 'newest', // newest, price_asc, price_desc
		status,
		sellerId,
		search // Tìm kiếm theo từ khóa
	} = req.query

	// Build query
	const query = {}

	// Nếu có sellerId, cho phép lấy tất cả status (seller xem sản phẩm của mình)
	// Nếu không có sellerId, mặc định chỉ lấy active (public)
	if (status) {
		query.status = status
	} else if (!sellerId) {
		// Chỉ lấy sản phẩm active cho public (không có sellerId)
		query.status = 'active'
	}

	if (categoryId) {
		query.categoryId = categoryId
	}

	if (location) {
		query.location = location
	}

	if (condition) {
		query.condition = condition
	}

	if (minPrice || maxPrice) {
		query.price = {}
		if (minPrice) query.price.$gte = Number(minPrice)
		if (maxPrice) query.price.$lte = Number(maxPrice)
	}

	if (sellerId) {
		query.seller = sellerId
	}

	// Tìm kiếm theo từ khóa
	if (search) {
		query.$or = [
			{ title: { $regex: search, $options: 'i' } },
			{ description: { $regex: search, $options: 'i' } }
		]
	}

	// Sort
	let sort = {}
	switch (sortBy) {
		case 'price_asc':
			sort = { price: 1 }
			break
		case 'price_desc':
			sort = { price: -1 }
			break
		case 'newest':
		default:
			sort = { createdAt: -1 }
			break
	}

	// Pagination
	const skip = (Number(page) - 1) * Number(limit)

	// Execute query
	const products = await Product.find(query)
		.populate('seller', 'name email')
		.sort(sort)
		.skip(skip)
		.limit(Number(limit))
		.lean()

	const total = await Product.countDocuments(query)

	// Format response
	const formattedProducts = products.map((product) => ({
		id: product._id.toString(),
		title: product.title,
		priceText: new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND'
		}).format(product.price),
		price: product.price,
		imageUrl:
			product.images && product.images.length > 0
				? product.images[0]
				: 'https://placehold.co/400x300',
		images: product.images,
		condition: product.condition,
		conditionColor: getConditionColor(product.condition),
		sellerName: product.sellerName || product.seller?.name || 'Unknown',
		sellerAvatarUrl: product.seller?.avatarUrl,
		location: product.location,
		categoryId: product.categoryId,
		timeAgo: getTimeAgo(product.createdAt),
		stock: product.stock,
		status: product.status,
		views: product.views
	}))

	res.status(200).json({
		success: true,
		data: {
			products: formattedProducts,
			pagination: {
				page: Number(page),
				limit: Number(limit),
				total,
				totalPages: Math.ceil(total / Number(limit))
			}
		}
	})
})

// Lấy sản phẩm theo ID
export const getProductById = asyncHandler(async (req, res) => {
	const { id } = req.params

	const product = await Product.findById(id).populate(
		'seller',
		'name email phone'
	)

	if (!product) {
		return res.status(404).json({
			success: false,
			message: 'Không tìm thấy sản phẩm'
		})
	}

	// Tăng view count
	product.views += 1
	await product.save()

	const formattedProduct = {
		id: product._id.toString(),
		title: product.title,
		description: product.description,
		priceText: new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND'
		}).format(product.price),
		price: product.price,
		images:
			product.images && product.images.length > 0
				? product.images
				: ['https://placehold.co/400x300'],
		condition: product.condition,
		conditionColor: getConditionColor(product.condition),
		sellerName: product.sellerName || product.seller?.name || 'Unknown',
		sellerId: product.seller ? product.seller._id.toString() : null,
		sellerAvatarUrl: product.seller?.avatarUrl || null,
		location: product.location,
		categoryId: product.categoryId,
		timeAgo: getTimeAgo(product.createdAt),
		stock: product.stock,
		status: product.status,
		views: product.views,
		sku: product.sku,
		createdAt: product.createdAt,
		updatedAt: product.updatedAt
	}

	res.status(200).json({
		success: true,
		data: {
			product: formattedProduct
		}
	})
})

// Tạo sản phẩm mới (cần authenticate và là seller)
export const createProduct = asyncHandler(async (req, res) => {
	const {
		title,
		description,
		price,
		images,
		condition,
		categoryId,
		location,
		stock,
		sku
	} = req.body

	const sellerId = req.user._id

	// Kiểm tra user có phải seller không
	if (req.user.role !== 'seller' && req.user.role !== 'admin') {
		return res.status(403).json({
			success: false,
			message: 'Chỉ người bán mới có thể tạo sản phẩm'
		})
	}

	const product = await Product.create({
		title,
		description,
		price,
		images: images || [],
		condition: condition || 'Tốt',
		categoryId,
		location,
		seller: sellerId,
		sellerName: req.user.name,
		stock: stock || 1,
		sku,
		status: 'pending' // Mặc định chờ duyệt
	})

	const formattedProduct = {
		id: product._id.toString(),
		title: product.title,
		priceText: new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND'
		}).format(product.price),
		price: product.price,
		imageUrl:
			product.images && product.images.length > 0
				? product.images[0]
				: 'https://placehold.co/400x300',
		condition: product.condition,
		conditionColor: getConditionColor(product.condition),
		sellerName: product.sellerName,
		location: product.location,
		categoryId: product.categoryId,
		status: product.status
	}
res.status(201).json({
		success: true,
		message: 'Tạo sản phẩm thành công',
		data: {
			product: formattedProduct
		}
	})
})

// Cập nhật sản phẩm
export const updateProduct = asyncHandler(async (req, res) => {
	const { id } = req.params
	const updateData = req.body

	const product = await Product.findById(id)

	if (!product) {
		return res.status(404).json({
			success: false,
			message: 'Không tìm thấy sản phẩm'
		})
	}

	// Chỉ seller của sản phẩm hoặc admin mới được cập nhật
	if (
		product.seller.toString() !== req.user._id.toString() &&
		req.user.role !== 'admin'
	) {
		return res.status(403).json({
			success: false,
			message: 'Bạn không có quyền cập nhật sản phẩm này'
		})
	}

	// Không cho phép cập nhật một số trường
	delete updateData.seller
	delete updateData.sellerName
	delete updateData.views

	Object.assign(product, updateData)
	await product.save()

	res.status(200).json({
		success: true,
		message: 'Cập nhật sản phẩm thành công',
		data: {
			product
		}
	})
})

// Xóa sản phẩm
export const deleteProduct = asyncHandler(async (req, res) => {
	const { id } = req.params

	const product = await Product.findById(id)

	if (!product) {
		return res.status(404).json({
			success: false,
			message: 'Không tìm thấy sản phẩm'
		})
	}

	// Chỉ seller của sản phẩm hoặc admin mới được xóa
	if (
		product.seller.toString() !== req.user._id.toString() &&
		req.user.role !== 'admin'
	) {
		return res.status(403).json({
			success: false,
			message: 'Bạn không có quyền xóa sản phẩm này'
		})
	}

	await Product.findByIdAndDelete(id)

	res.status(200).json({
		success: true,
		message: 'Xóa sản phẩm thành công'
	})
})

export const getProductMetadata = asyncHandler(async (req, res) => {
	const categories = await Product.distinct('categoryId', {
		status: 'active' // Chỉ lấy categories từ sản phẩm active
	})

	const locations = await Product.distinct('location', {
		status: 'active' // Chỉ lấy locations từ sản phẩm active
	})

	// Map categories với label (có thể mở rộng sau)
	const categoryMap = {
		'quan-ao': 'Quần áo',
		'giay-dep': 'Giày dép',
		'phu-kien': 'Phụ kiện',
		'do-dien-tu': 'Đồ điện tử',
		'do-gia-dung': 'Đồ gia dụng',
		khac: 'Khác'
	}

	const formattedCategories = categories
		.filter((cat) => cat) // Loại bỏ null/undefined
		.map((cat) => ({
			id: cat,
			label: categoryMap[cat] || cat
		}))

	// Sắp xếp locations theo thứ tự alphabet
	const sortedLocations = locations
		.filter((loc) => loc) // Loại bỏ null/undefined
		.sort()

	res.status(200).json({
		success: true,
		data: {
			categories: formattedCategories,
			locations: sortedLocations
		}
	})
})

// Helper functions
function getConditionColor(condition) {
	const colorMap = {
		'Like New': 'primary',
		Tốt: 'blue',
		Khá: 'orange',
		Cũ: 'gray'
	}
	return colorMap[condition] || 'blue'
}

function getTimeAgo(date) {
	const now = new Date()
	const diff = now - date
	const seconds = Math.floor(diff / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)

	if (seconds < 60) return 'Vừa xong'
	if (minutes < 60) return `${minutes} phút trước`
	if (hours < 24) return `${hours} giờ trước`
	if (days < 7) return `${days} ngày trước`
	return `${Math.floor(days / 7)} tuần trước`
}