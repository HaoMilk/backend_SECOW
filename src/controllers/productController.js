import Product from '../models/Product.js'
import asyncHandler from '../middleware/asyncHandler.js'
import { uploadToCloudinary } from '../config/cloudinary.js'

/**
 * ==============================
 * GET PRODUCTS (PUBLIC)
 * ==============================
 */
export const getProducts = asyncHandler(async (req, res) => {
	const {
		page = 1,
		limit = 12,
		categoryId,
		location,
		condition,
		minPrice,
		maxPrice,
		sortBy = 'newest',
		status,
		sellerId,
		search
	} = req.query

	const query = {}

	// Public chỉ xem active, seller xem tất cả
	if (status) {
		query.status = status
	} else if (!sellerId) {
		query.status = 'active'
	}

	if (categoryId) query.categoryId = categoryId
	if (location) query.location = location
	if (condition) query.condition = condition
	if (sellerId) query.seller = sellerId

	if (minPrice || maxPrice) {
		query.price = {}
		if (minPrice) query.price.$gte = Number(minPrice)
		if (maxPrice) query.price.$lte = Number(maxPrice)
	}

	if (search) {
		query.$or = [
			{ title: { $regex: search, $options: 'i' } },
			{ description: { $regex: search, $options: 'i' } }
		]
	}

	let sort = { createdAt: -1 }
	if (sortBy === 'price_asc') sort = { price: 1 }
	if (sortBy === 'price_desc') sort = { price: -1 }

	const skip = (Number(page) - 1) * Number(limit)

	const products = await Product.find(query)
		.populate('seller', 'name avatarUrl')
		.sort(sort)
		.skip(skip)
		.limit(Number(limit))
		.lean()

	const total = await Product.countDocuments(query)

	const formattedProducts = products.map((product) => {
		// Map condition values for frontend compatibility
		const conditionMap = {
			'Tốt': 'Good',
			'Khá': 'Fair',
			'Cũ': 'Old',
			'Like New': 'Like New'
		}
		const mappedCondition = conditionMap[product.condition] || product.condition

		return {
			id: product._id.toString(),
			title: product.title,
			price: product.price,
			priceText: formatPrice(product.price),
			imageUrl:
				product.images?.length > 0
					? product.images[0]
					: 'https://placehold.co/400x300',
			images: product.images,
			condition: mappedCondition,
			conditionColor: getConditionColor(product.condition),
			sellerName: product.sellerName || product.seller?.name || 'Unknown',
			sellerAvatarUrl: product.seller?.avatarUrl,
			location: product.location,
			categoryId: product.categoryId,
			timeAgo: getTimeAgo(product.createdAt),
			stock: product.stock,
			status: product.status,
			views: product.views
		}
	})

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

/**
 * ==============================
 * GET PRODUCT BY ID
 * ==============================
 */
export const getProductById = asyncHandler(async (req, res) => {
	const { id } = req.params

	const product = await Product.findById(id).populate(
		'seller',
		'name email phone avatarUrl'
	)

	if (!product) {
		return res.status(404).json({
			success: false,
			message: 'Không tìm thấy sản phẩm'
		})
	}

	product.views += 1
	await product.save()

	// Map condition values for frontend compatibility
	const conditionMap = {
		'Tốt': 'Good',
		'Khá': 'Fair',
		'Cũ': 'Old',
		'Like New': 'Like New'
	}
	const mappedCondition = conditionMap[product.condition] || product.condition

	// Parse location if it's a string
	let locationData = product.location
	if (typeof locationData === 'string') {
		// Try to parse as JSON, if fails, use as is
		try {
			locationData = JSON.parse(locationData)
		} catch (e) {
			// If not JSON, create object from string
			locationData = { city: locationData, district: '', detail: '' }
		}
	}

	res.status(200).json({
		success: true,
		data: {
			product: {
				id: product._id.toString(),
				title: product.title,
				description: product.description,
				price: product.price,
				priceText: formatPrice(product.price),
				images:
					product.images?.length > 0
						? product.images
						: ['https://placehold.co/400x300'],
				condition: mappedCondition,
				conditionColor: getConditionColor(product.condition),
				sellerName: product.sellerName || product.seller?.name,
				sellerId: product.seller?._id.toString(),
				sellerAvatarUrl: product.seller?.avatarUrl,
				location: locationData,
				categoryId: product.categoryId,
				timeAgo: getTimeAgo(product.createdAt),
				stock: product.stock,
				status: product.status,
				views: product.views,
				sku: product.sku,
				brand: product.brand,
				weight: product.weight,
				originalPrice: product.originalPrice,
				attributes: product.attributes || [],
				video: product.video,
				createdAt: product.createdAt,
				updatedAt: product.updatedAt
			}
		}
	})
})

/**
 * ==============================
 * CREATE PRODUCT (SELLER)
 * ==============================
 */
export const createProduct = asyncHandler(async (req, res) => {
	if (!['seller', 'admin'].includes(req.user.role)) {
		return res.status(403).json({
			success: false,
			message: 'Chỉ người bán mới có thể tạo sản phẩm'
		})
	}

	// Upload images to Cloudinary
	const imageUrls = []
	if (req.files && req.files.length > 0) {
		for (const file of req.files) {
			try {
				const result = await uploadToCloudinary(file.buffer, 'products')
				imageUrls.push(result.secure_url)
			} catch (error) {
				console.error('Error uploading image:', error)
				return res.status(500).json({
					success: false,
					message: 'Lỗi khi upload ảnh lên server'
				})
			}
		}
	}

	// Handle existing images (if updating)
	const existingImages = req.body.existingImages 
		? (Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages])
		: []

	// Parse location from JSON string if needed
	let location = req.body.location
	if (typeof location === 'string') {
		try {
			location = JSON.parse(location)
		} catch (e) {
			// If not JSON, keep as string
		}
	}

	// Parse attributes from JSON string if needed
	let attributes = req.body.attributes || []
	if (typeof attributes === 'string') {
		try {
			attributes = JSON.parse(attributes)
		} catch (e) {
			attributes = []
		}
	}

	// Map condition values
	const conditionMap = {
		'Good': 'Tốt',
		'Fair': 'Khá',
		'Old': 'Cũ',
		'Like New': 'Like New'
	}
	const condition = conditionMap[req.body.condition] || req.body.condition || 'Tốt'

	// Format location as string for display
	const locationString = typeof location === 'object' 
		? `${location.city || ''}${location.district ? ', ' + location.district : ''}${location.detail ? ', ' + location.detail : ''}`.trim()
		: location

	const product = await Product.create({
		title: req.body.title,
		description: req.body.description,
		price: Number(req.body.price),
		originalPrice: req.body.originalPrice ? Number(req.body.originalPrice) : undefined,
		stock: req.body.stock ? Number(req.body.stock) : 1,
		weight: req.body.weight ? Number(req.body.weight) : undefined,
		brand: req.body.brand,
		condition: condition,
		categoryId: req.body.categoryId,
		images: [...existingImages, ...imageUrls],
		location: locationString || location,
		attributes: attributes,
		seller: req.user._id,
		sellerName: req.user.name,
		status: 'pending'
	})

	res.status(201).json({
		success: true,
		message: 'Tạo sản phẩm thành công',
		data: {
			product
		}
	})
})

/**
 * ==============================
 * UPDATE PRODUCT
 * ==============================
 */
export const updateProduct = asyncHandler(async (req, res) => {
	const product = await Product.findById(req.params.id)

	if (!product) {
		return res.status(404).json({
			success: false,
			message: 'Không tìm thấy sản phẩm'
		})
	}

	if (
		product.seller.toString() !== req.user._id.toString() &&
		req.user.role !== 'admin'
	) {
		return res.status(403).json({
			success: false,
			message: 'Bạn không có quyền cập nhật sản phẩm này'
		})
	}

	// Upload new images to Cloudinary
	const newImageUrls = []
	if (req.files && req.files.length > 0) {
		for (const file of req.files) {
			try {
				const result = await uploadToCloudinary(file.buffer, 'products')
				newImageUrls.push(result.secure_url)
			} catch (error) {
				console.error('Error uploading image:', error)
				return res.status(500).json({
					success: false,
					message: 'Lỗi khi upload ảnh lên server'
				})
			}
		}
	}

	// Handle existing images
	const existingImages = req.body.existingImages 
		? (Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages])
		: []

	// Parse location from JSON string if needed
	let location = req.body.location
	if (typeof location === 'string') {
		try {
			const parsed = JSON.parse(location)
			location = typeof parsed === 'object' 
				? `${parsed.city || ''}${parsed.district ? ', ' + parsed.district : ''}${parsed.detail ? ', ' + parsed.detail : ''}`.trim()
				: location
		} catch (e) {
			// If not JSON, keep as string
		}
	}

	// Parse attributes from JSON string if needed
	let attributes = req.body.attributes
	if (typeof attributes === 'string') {
		try {
			attributes = JSON.parse(attributes)
		} catch (e) {
			attributes = undefined
		}
	}

	// Map condition values
	if (req.body.condition) {
		const conditionMap = {
			'Good': 'Tốt',
			'Fair': 'Khá',
			'Old': 'Cũ',
			'Like New': 'Like New'
		}
		req.body.condition = conditionMap[req.body.condition] || req.body.condition
	}

	// Update product fields
	if (req.body.title) product.title = req.body.title
	if (req.body.description !== undefined) product.description = req.body.description
	if (req.body.price) product.price = Number(req.body.price)
	if (req.body.originalPrice !== undefined) product.originalPrice = req.body.originalPrice ? Number(req.body.originalPrice) : undefined
	if (req.body.stock !== undefined) product.stock = Number(req.body.stock)
	if (req.body.weight !== undefined) product.weight = req.body.weight ? Number(req.body.weight) : undefined
	if (req.body.brand !== undefined) product.brand = req.body.brand
	if (req.body.condition) product.condition = req.body.condition
	if (req.body.categoryId) product.categoryId = req.body.categoryId
	if (location) product.location = location
	if (attributes !== undefined) product.attributes = attributes
	
	// Update images: combine existing and new
	if (newImageUrls.length > 0 || existingImages.length > 0) {
		product.images = [...existingImages, ...newImageUrls]
	}

	// Prevent updating these fields
	delete req.body.seller
	delete req.body.sellerName
	delete req.body.views

	await product.save()

	res.status(200).json({
		success: true,
		message: 'Cập nhật sản phẩm thành công',
		data: { product }
	})
})

/**
 * ==============================
 * DELETE PRODUCT
 * ==============================
 */
export const deleteProduct = asyncHandler(async (req, res) => {
	const product = await Product.findById(req.params.id)

	if (!product) {
		return res.status(404).json({
			success: false,
			message: 'Không tìm thấy sản phẩm'
		})
	}

	if (
		product.seller.toString() !== req.user._id.toString() &&
		req.user.role !== 'admin'
	) {
		return res.status(403).json({
			success: false,
			message: 'Bạn không có quyền xóa sản phẩm này'
		})
	}

	await Product.findByIdAndDelete(req.params.id)

	res.status(200).json({
		success: true,
		message: 'Xóa sản phẩm thành công'
	})
})

/**
 * ==============================
 * GET SELLER PRODUCTS (DASHBOARD)
 * ==============================
 */
export const getSellerProducts = asyncHandler(async (req, res) => {
	const {
		page = 1,
		limit = 10,
		status,
		title,
		categoryId,
		sortBy
	} = req.query

	const query = { seller: req.user._id }

	if (status) query.status = status
	if (categoryId) query.categoryId = categoryId
	if (title) query.title = { $regex: title, $options: 'i' }

	let sort = { createdAt: -1 }
	if (sortBy) {
		const [field, order] = sortBy.split(':')
		sort[field] = order === 'asc' ? 1 : -1
	}

	const skip = (Number(page) - 1) * Number(limit)

	const products = await Product.find(query)
		.sort(sort)
		.skip(skip)
		.limit(Number(limit))

	const total = await Product.countDocuments(query)

	res.status(200).json({
		success: true,
		data: {
			products,
			pagination: {
				page: Number(page),
				limit: Number(limit),
				total,
				totalPages: Math.ceil(total / Number(limit))
			}
		}
	})
})

/**
 * ==============================
 * METADATA
 * ==============================
 */
export const getProductMetadata = asyncHandler(async (req, res) => {
	const categories = await Product.distinct('categoryId', { status: 'active' })
	const locations = await Product.distinct('location', { status: 'active' })

	res.status(200).json({
		success: true,
		data: {
			categories,
			locations: locations.sort()
		}
	})
})

/**
 * ==============================
 * HELPERS
 * ==============================
 */
function formatPrice(price) {
	return new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency: 'VND'
	}).format(price)
}

function getConditionColor(condition) {
	return {
		'Like New': 'primary',
		Tốt: 'blue',
		Khá: 'orange',
		Cũ: 'gray'
	}[condition] || 'blue'
}

function getTimeAgo(date) {
	const diff = Date.now() - new Date(date)
	const minutes = Math.floor(diff / 60000)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)

	if (minutes < 1) return 'Vừa xong'
	if (minutes < 60) return `${minutes} phút trước`
	if (hours < 24) return `${hours} giờ trước`
	if (days < 7) return `${days} ngày trước`
	return `${Math.floor(days / 7)} tuần trước`
}
