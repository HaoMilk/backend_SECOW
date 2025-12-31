import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Memory storage cho multer
const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(
      file.originalname.toLowerCase().split(".").pop()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Chỉ cho phép upload file ảnh (jpeg, jpg, png, webp)"));
    }
  },
});

// Helper function để upload buffer lên Cloudinary
export const uploadToCloudinary = (buffer, folder = "secondhand-marketplace") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "image",
        transformation: [
          {
            width: 1200,
            height: 1200,
            crop: "limit",
            quality: "auto",
          },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

// Helper function để upload từ URL
export const uploadFromUrl = (url, folder = "secondhand-marketplace") => {
  return cloudinary.uploader.upload(url, {
    folder: folder,
    resource_type: "image",
    transformation: [
      {
        width: 1200,
        height: 1200,
        crop: "limit",
        quality: "auto",
      },
    ],
  });
};

// Helper function để xóa ảnh
export const deleteFromCloudinary = (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

export default cloudinary;

