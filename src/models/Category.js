import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên danh mục là bắt buộc"],
      unique: true,
      trim: true,
    },
    image: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    }
  },
  {
    timestamps: true,
  }
);

categorySchema.pre('save', async function (next) {
  if (this.parentId) {
    const parentCategory = await this.constructor.findById(this.parentId);
    if (parentCategory && parentCategory.parentId) {
      throw new Error('Danh mục con không thể làm danh mục cha.');
    }
  } 
});


const Category = mongoose.model("Category", categorySchema);

export default Category;
