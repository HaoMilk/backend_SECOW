import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Người dùng là bắt buộc"],
      index: true, // Index để query nhanh theo user
    },
    receiver: {
      type: String,
      required: [true, "Tên người nhận là bắt buộc"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Số điện thoại là bắt buộc"],
      trim: true,
      validate: {
        validator: function(v) {
          return /^[0-9]{10,11}$/.test(v);
        },
        message: "Số điện thoại phải có 10-11 chữ số",
      },
    },
    street: {
      type: String,
      required: [true, "Địa chỉ chi tiết là bắt buộc"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "Tỉnh/thành phố là bắt buộc"],
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    ward: {
      type: String,
      trim: true,
    },
    provinceCode: {
      type: String,
      trim: true,
    },
    districtCode: {
      type: String,
      trim: true,
    },
    wardCode: {
      type: String,
      trim: true,
    },
    label: {
      type: String,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index để đảm bảo chỉ có một địa chỉ mặc định cho mỗi user
addressSchema.index({ user: 1, isDefault: 1 });

// Method để format địa chỉ đầy đủ
addressSchema.methods.getFullAddress = function () {
  const parts = [];
  if (this.street) parts.push(this.street);
  if (this.ward) parts.push(this.ward);
  if (this.district) parts.push(this.district);
  if (this.city) parts.push(this.city);
  return parts.join(", ");
};

const Address = mongoose.model("Address", addressSchema);

export default Address;

