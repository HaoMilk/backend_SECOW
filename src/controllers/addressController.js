import asyncHandler from "../middleware/asyncHandler.js";
import Address from "../models/Address.js";

/**
 * ==============================
 * GET ALL ADDRESSES
 * ==============================
 */
export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  
  res.status(200).json({
    success: true,
    data: {
      addresses: addresses || [],
    },
  });
});

/**
 * ==============================
 * ADD NEW ADDRESS
 * ==============================
 */
export const addAddress = asyncHandler(async (req, res) => {
  const { receiver, phone, street, city, district, ward, provinceCode, districtCode, wardCode, label, isDefault } = req.body;

  // Validation
  if (!receiver || !receiver.trim()) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập tên người nhận",
    });
  }

  if (!phone || !phone.trim()) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập số điện thoại",
    });
  }

  if (!/^[0-9]{10,11}$/.test(phone.trim())) {
    return res.status(400).json({
      success: false,
      message: "Số điện thoại không hợp lệ",
    });
  }

  if (!street || !street.trim()) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập địa chỉ chi tiết",
    });
  }

  if (!city || !city.trim()) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng chọn tỉnh/thành phố",
    });
  }

  // Validate district and ward codes if provided (optional but recommended)
  if (!districtCode || !districtCode.trim()) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng chọn quận/huyện",
    });
  }

  if (!wardCode || !wardCode.trim()) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng chọn phường/xã",
    });
  }

  // Check if this is the first address for the user
  const existingAddresses = await Address.find({ user: req.user._id });
  const shouldBeDefault = existingAddresses.length === 0 ? true : (isDefault || false);

  // If setting as default, unset other default addresses first
  if (shouldBeDefault) {
    await Address.updateMany(
      { user: req.user._id, isDefault: true },
      { $set: { isDefault: false } }
    );
  }

  const newAddress = await Address.create({
    user: req.user._id,
    receiver: receiver.trim(),
    phone: phone.trim(),
    street: street.trim(),
    city: city.trim(),
    district: (district || "").trim(),
    ward: (ward || "").trim(),
    provinceCode: provinceCode || "",
    districtCode: districtCode || "",
    wardCode: wardCode || "",
    label: (label || "").trim(),
    isDefault: shouldBeDefault,
  });

  res.status(201).json({
    success: true,
    message: "Thêm địa chỉ thành công",
    data: {
      address: newAddress,
    },
  });
});

/**
 * ==============================
 * UPDATE ADDRESS
 * ==============================
 */
export const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const { receiver, phone, street, city, district, ward, provinceCode, districtCode, wardCode, label, isDefault } = req.body;

  const address = await Address.findOne({ _id: addressId, user: req.user._id });

  if (!address) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy địa chỉ",
    });
  }

  // Validation
  if (receiver) address.receiver = receiver.trim();
  if (phone) {
    if (!/^[0-9]{10,11}$/.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại không hợp lệ",
      });
    }
    address.phone = phone.trim();
  }
  if (street) address.street = street.trim();
  if (city) address.city = city.trim();
  if (district !== undefined) address.district = district.trim();
  if (ward !== undefined) address.ward = ward.trim();
  if (provinceCode !== undefined) address.provinceCode = provinceCode;
  if (districtCode !== undefined) address.districtCode = districtCode;
  if (wardCode !== undefined) address.wardCode = wardCode;
  if (label !== undefined) address.label = label.trim();

  // If setting as default, unset other default addresses first
  if (isDefault !== undefined && isDefault === true) {
    await Address.updateMany(
      { user: req.user._id, _id: { $ne: addressId }, isDefault: true },
      { $set: { isDefault: false } }
    );
    address.isDefault = true;
  } else if (isDefault !== undefined) {
    address.isDefault = false;
  }

  await address.save();

  res.status(200).json({
    success: true,
    message: "Cập nhật địa chỉ thành công",
    data: {
      address,
    },
  });
});

/**
 * ==============================
 * DELETE ADDRESS
 * ==============================
 */
export const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const address = await Address.findOne({ _id: addressId, user: req.user._id });

  if (!address) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy địa chỉ",
    });
  }

  await Address.findByIdAndDelete(addressId);

  res.status(200).json({
    success: true,
    message: "Xóa địa chỉ thành công",
  });
});

/**
 * ==============================
 * SET DEFAULT ADDRESS
 * ==============================
 */
export const setDefaultAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const address = await Address.findOne({ _id: addressId, user: req.user._id });

  if (!address) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy địa chỉ",
    });
  }

  // Unset all defaults for this user
  await Address.updateMany(
    { user: req.user._id, _id: { $ne: addressId } },
    { $set: { isDefault: false } }
  );

  // Set this as default
  address.isDefault = true;
  await address.save();

  res.status(200).json({
    success: true,
    message: "Đặt địa chỉ mặc định thành công",
    data: {
      address,
    },
  });
});

