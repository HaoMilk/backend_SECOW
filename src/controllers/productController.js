import Product from '../models/Product.js'
import Category from '../models/Category.js'
import Store from '../models/Store.js'
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

	console.log('=== CREATE PRODUCT DEBUG ===')
	console.log('Files received:', req.files ? Object.keys(req.files) : 'No files')
	console.log('Body keys:', Object.keys(req.body))
	console.log('Creating product - Body:', { 
		title: req.body.title, 
		price: req.body.price,
		categoryId: req.body.categoryId,
		hasImages: req.files?.images?.length || 0,
		hasVideo: req.files?.video?.length || 0,
		existingImagesCount: Array.isArray(req.body.existingImages) ? req.body.existingImages.length : (req.body.existingImages ? 1 : 0)
	})

	// Upload images to Cloudinary
	const imageUrls = []
	if (req.files && req.files.images && req.files.images.length > 0) {
		console.log(`Uploading ${req.files.images.length} image(s) to Cloudinary...`)
		for (let i = 0; i < req.files.images.length; i++) {
			const file = req.files.images[i]
			console.log(`Image ${i + 1}:`, {
				originalname: file.originalname,
				mimetype: file.mimetype,
				size: file.size,
				bufferLength: file.buffer?.length || 0
			})
			try {
				if (!file.buffer || file.buffer.length === 0) {
					throw new Error('File buffer is empty')
				}
				const result = await uploadToCloudinary(file.buffer, 'secondhand-marketplace/products', 'image')
				console.log(`Image ${i + 1} uploaded successfully:`, result.secure_url)
				imageUrls.push(result.secure_url)
			} catch (error) {
				console.error(`Error uploading image ${i + 1} to Cloudinary:`, error)
				return res.status(500).json({
					success: false,
					message: `Lỗi khi upload ảnh ${i + 1} lên Cloudinary: ${error.message || 'Unknown error'}`
				})
			}
		}
	} else {
		console.log('No new images provided for upload')
	}

	// Upload video to Cloudinary if provided
	let videoUrl = null
	if (req.files && req.files.video && req.files.video.length > 0) {
		try {
			console.log('Uploading video to Cloudinary...')
			const result = await uploadToCloudinary(req.files.video[0].buffer, 'secondhand-marketplace/products', 'video')
			videoUrl = result.secure_url
			console.log('Video uploaded successfully:', videoUrl)
		} catch (error) {
			console.error('Error uploading video to Cloudinary:', error)
			return res.status(500).json({
				success: false,
				message: 'Lỗi khi upload video lên Cloudinary: ' + (error.message || 'Unknown error')
			})
		}
	} else if (req.body.existingVideo) {
		// Handle existing video URL
		videoUrl = req.body.existingVideo
	}

	// Handle existing images (if updating)
	// FormData với nhiều field cùng tên sẽ tạo array, nếu chỉ có 1 thì là string
	let existingImages = []
	if (req.body.existingImages) {
		if (Array.isArray(req.body.existingImages)) {
			existingImages = req.body.existingImages.filter(img => img && img.trim() !== '')
		} else if (typeof req.body.existingImages === 'string' && req.body.existingImages.trim() !== '') {
			existingImages = [req.body.existingImages]
		}
	}
	
	console.log('Existing images:', existingImages)
	console.log('New image URLs:', imageUrls)
	const finalImages = [...existingImages, ...imageUrls]
	console.log('Final images array:', finalImages)

	// Validate that we have at least one image
	if (finalImages.length === 0) {
		return res.status(400).json({
			success: false,
			message: 'Vui lòng tải lên ít nhất 1 hình ảnh sản phẩm'
		})
	}

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

	// Validate required fields
	if (!req.body.title || !req.body.price || !req.body.categoryId) {
		return res.status(400).json({
			success: false,
			message: 'Vui lòng điền đầy đủ thông tin bắt buộc (tên sản phẩm, giá, danh mục)'
		})
	}

	const productData = {
		title: req.body.title,
		description: req.body.description || '',
		price: Number(req.body.price),
		originalPrice: req.body.originalPrice ? Number(req.body.originalPrice) : undefined,
		stock: req.body.stock ? Number(req.body.stock) : 1,
		weight: req.body.weight ? Number(req.body.weight) : undefined,
		brand: req.body.brand,
		condition: condition,
		categoryId: req.body.categoryId,
		images: finalImages,
		location: locationString || location,
		attributes: attributes,
		video: videoUrl,
		seller: req.user._id,
		sellerName: req.user.name,
		status: 'pending'
	}

	console.log('Creating product in database with data:', {
		title: productData.title,
		price: productData.price,
		imagesCount: productData.images.length,
		images: productData.images,
		seller: productData.seller
	})

	try {
		const product = await Product.create(productData)
		console.log('Product created successfully:', product._id)
		console.log('Product images saved:', product.images)
		
		res.status(201).json({
			success: true,
			message: 'Tạo sản phẩm thành công',
			data: {
				product
			}
		})
	} catch (error) {
		console.error('Error creating product in database:', error)
		return res.status(500).json({
			success: false,
			message: 'Lỗi khi lưu sản phẩm vào database: ' + (error.message || 'Unknown error')
		})
	}
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

	console.log('=== UPDATE PRODUCT DEBUG ===')
	console.log('Files received:', req.files ? Object.keys(req.files) : 'No files')
	console.log('Body keys:', Object.keys(req.body))

	// Upload new images to Cloudinary
	const newImageUrls = []
	if (req.files && req.files.images && req.files.images.length > 0) {
		console.log(`Uploading ${req.files.images.length} new image(s) to Cloudinary...`)
		for (let i = 0; i < req.files.images.length; i++) {
			const file = req.files.images[i]
			console.log(`New image ${i + 1}:`, {
				originalname: file.originalname,
				mimetype: file.mimetype,
				size: file.size,
				bufferLength: file.buffer?.length || 0
			})
			try {
				if (!file.buffer || file.buffer.length === 0) {
					throw new Error('File buffer is empty')
				}
				const result = await uploadToCloudinary(file.buffer, 'secondhand-marketplace/products', 'image')
				console.log(`New image ${i + 1} uploaded successfully:`, result.secure_url)
				newImageUrls.push(result.secure_url)
			} catch (error) {
				console.error(`Error uploading new image ${i + 1}:`, error)
				return res.status(500).json({
					success: false,
					message: `Lỗi khi upload ảnh ${i + 1} lên Cloudinary: ${error.message || 'Unknown error'}`
				})
			}
		}
	} else {
		console.log('No new images provided for upload')
	}

	// Upload video to Cloudinary if provided
	let videoUrl = undefined
	if (req.files && req.files.video && req.files.video.length > 0) {
		try {
			const result = await uploadToCloudinary(req.files.video[0].buffer, 'secondhand-marketplace/products', 'video')
			videoUrl = result.secure_url
		} catch (error) {
			console.error('Error uploading video:', error)
			return res.status(500).json({
				success: false,
				message: 'Lỗi khi upload video lên server'
			})
		}
	} else if (req.body.existingVideo !== undefined) {
		// Handle existing video URL or null (to remove video)
		videoUrl = req.body.existingVideo || null
	}

	// Handle existing images
	// FormData với nhiều field cùng tên sẽ tạo array, nếu chỉ có 1 thì là string
	let existingImages = []
	if (req.body.existingImages) {
		if (Array.isArray(req.body.existingImages)) {
			existingImages = req.body.existingImages.filter(img => img && img.trim() !== '')
		} else if (typeof req.body.existingImages === 'string' && req.body.existingImages.trim() !== '') {
			existingImages = [req.body.existingImages]
		}
	}
	console.log('Existing images:', existingImages)
	console.log('New image URLs:', newImageUrls)
	const finalImages = [...existingImages, ...newImageUrls]
	console.log('Final images array:', finalImages)

	// Validate that we have at least one image when updating images
	if (req.body.existingImages !== undefined || newImageUrls.length > 0) {
		if (finalImages.length === 0) {
			return res.status(400).json({
				success: false,
				message: 'Vui lòng giữ lại ít nhất 1 hình ảnh sản phẩm'
			})
		}
	}

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
	if (videoUrl !== undefined) product.video = videoUrl
	
	// Update images: combine existing and new
	// Always update if existingImages or newImageUrls are provided (even if empty arrays)
	// This allows users to remove all images by sending empty existingImages array
	if (req.body.existingImages !== undefined || newImageUrls.length > 0) {
		product.images = finalImages
		console.log('Updated product images:', product.images)
	}

	// When seller updates product, set status back to pending for re-approval
	// Admin updates don't change status
	if (req.user.role !== 'admin') {
		product.status = 'pending'
		// Clear violation reason if exists when product is updated
		product.violationReason = undefined
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
		.lean()

	const total = await Product.countDocuments(query)

	// Get category info for each product and format response
	const formattedProducts = await Promise.all(
		products.map(async (product) => {
			// Get category by categoryId (which is a string)
			const category = product.categoryId 
				? await Category.findById(product.categoryId).select('_id name').lean()
				: null

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
				try {
					const parsed = JSON.parse(locationData)
					if (typeof parsed === 'object' && parsed !== null) {
						locationData = parsed
					} else {
						// Try to parse from comma-separated string format
						const parts = locationData.split(',').map(s => s.trim()).filter(Boolean)
						if (parts.length >= 3) {
							locationData = {
								city: parts[0] || "",
								district: parts[1] || "",
								detail: parts.slice(2).join(', ') || ""
							}
						} else if (parts.length === 2) {
							locationData = {
								city: parts[0] || "",
								district: "",
								detail: parts[1] || ""
							}
						} else {
							locationData = { city: "", district: "", detail: locationData }
						}
					}
				} catch (e) {
					// If not JSON, try to parse from comma-separated string
					const parts = locationData.split(',').map(s => s.trim()).filter(Boolean)
					if (parts.length >= 3) {
						locationData = {
							city: parts[0] || "",
							district: parts[1] || "",
							detail: parts.slice(2).join(', ') || ""
						}
					} else if (parts.length === 2) {
						locationData = {
							city: parts[0] || "",
							district: "",
							detail: parts[1] || ""
						}
					} else {
						locationData = { city: "", district: "", detail: locationData }
					}
				}
			} else if (!locationData || typeof locationData !== 'object') {
				locationData = { city: "", district: "", detail: "" }
			} else {
				// Ensure location object has all required fields
				locationData = {
					city: locationData.city || "",
					district: locationData.district || "",
					detail: locationData.detail || ""
				}
			}

			return {
				_id: product._id.toString(),
				title: product.title,
				description: product.description || "",
				price: product.price,
				originalPrice: product.originalPrice || 0,
				stock: product.stock || 0,
				weight: product.weight || 0,
				brand: product.brand || "",
				condition: mappedCondition,
				categoryId: product.categoryId || "",
				category: category ? {
					_id: category._id.toString(),
					name: category.name
				} : null,
				video: product.video || null,
				location: locationData,
				attributes: product.attributes || [],
				images: product.images || [],
				status: product.status,
				createdAt: product.createdAt,
				updatedAt: product.updatedAt
			}
		})
	)

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

/**
 * ==============================
 * GET ADMIN PRODUCTS (ADMIN ONLY)
 * ==============================
 */
export const getAdminProducts = asyncHandler(async (req, res) => {
	const {
		page = 1,
		limit = 10,
		status,
		search,
		sortBy = 'createdAt',
		sortOrder = 'desc'
	} = req.query

	const query = {}

	// Filter by status if provided
	if (status) {
		query.status = status
	}

	// Search by title or description
	if (search) {
		query.$or = [
			{ title: { $regex: search, $options: 'i' } },
			{ description: { $regex: search, $options: 'i' } }
		]
	}

	// Sort
	const sort = {}
	const order = sortOrder === 'asc' ? 1 : -1
	sort[sortBy] = order

	const skip = (Number(page) - 1) * Number(limit)

	const products = await Product.find(query)
		.populate('seller', 'name email avatarUrl')
		.sort(sort)
		.skip(skip)
		.limit(Number(limit))
		.lean()

	// Get category and store info for each product
	const productsWithStore = await Promise.all(
		products.map(async (product) => {
			// Get category by categoryId (which is a string)
			const category = product.categoryId 
				? await Category.findById(product.categoryId).select('name').lean()
				: null
			
			// Get store info for seller
			const store = product.seller?._id
				? await Store.findOne({ seller: product.seller._id }).lean()
				: null

			return {
				...product,
				category: category ? {
					_id: category._id,
					name: category.name
				} : null,
				seller: {
					_id: product.seller?._id,
					name: product.seller?.name,
					email: product.seller?.email,
					storeName: store?.storeName || product.sellerName,
					logo: store?.logo || product.seller?.avatarUrl
				}
			}
		})
	)

	const total = await Product.countDocuments(query)

	res.status(200).json({
		success: true,
		data: {
			products: productsWithStore
		},
		pagination: {
			page: Number(page),
			limit: Number(limit),
			total,
			totalPages: Math.ceil(total / Number(limit))
		}
	})
})

/**
 * ==============================
 * APPROVE PRODUCT (ADMIN ONLY)
 * ==============================
 */
export const approveProduct = asyncHandler(async (req, res) => {
	const { id } = req.params

	const product = await Product.findById(id)

	if (!product) {
		return res.status(404).json({
			success: false,
			message: 'Không tìm thấy sản phẩm'
		})
	}

	if (product.status !== 'pending') {
		return res.status(400).json({
			success: false,
			message: `Sản phẩm đã ở trạng thái ${product.status}, không thể duyệt`
		})
	}

	product.status = 'active'
	await product.save()

	res.status(200).json({
		success: true,
		message: 'Đã duyệt sản phẩm thành công',
		data: {
			product
		}
	})
})

/**
 * ==============================
 * REJECT PRODUCT (ADMIN ONLY)
 * ==============================
 */
export const rejectProduct = asyncHandler(async (req, res) => {
	const { id } = req.params
	const { violationReason } = req.body

	const product = await Product.findById(id)

	if (!product) {
		return res.status(404).json({
			success: false,
			message: 'Không tìm thấy sản phẩm'
		})
	}

	if (product.status !== 'pending') {
		return res.status(400).json({
			success: false,
			message: `Sản phẩm đã ở trạng thái ${product.status}, không thể từ chối`
		})
	}

	if (!violationReason || violationReason.trim() === '') {
		return res.status(400).json({
			success: false,
			message: 'Vui lòng nhập lý do từ chối'
		})
	}

	product.status = 'violation'
	product.violationReason = violationReason.trim()
	await product.save()

	res.status(200).json({
		success: true,
		message: 'Đã từ chối sản phẩm',
		data: {
			product
		}
	})
})
