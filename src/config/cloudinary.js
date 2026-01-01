import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";
import dotenv from "dotenv";

dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for files
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "images") {
      const allowedTypes = /jpeg|jpg|png|webp/;
      if (!allowedTypes.test(file.mimetype)) {
        return cb(new Error("Chỉ cho phép upload file ảnh (jpeg, jpg, png, webp)"));
      }
    } else if (file.fieldname === "video") {
      const allowedTypes = /mp4|mov|avi/;
      if (!allowedTypes.test(file.mimetype)) {
        return cb(new Error("Chỉ cho phép upload file video (mp4, mov, avi)"));
      }
    }
    cb(null, true);
  },
}).fields([
  { name: 'images', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]);

export const uploadCategoryImage = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for category image
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    if (!allowedTypes.test(file.mimetype)) {
      return cb(new Error("Chỉ cho phép upload file ảnh (jpeg, jpg, png, webp)"));
    }
    cb(null, true);
  },
}).single('image');


export const uploadImageToCloudinary = (buffer, folder = "secondhand-marketplace/products") => {
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
    Readable.from(buffer).pipe(uploadStream);
  });
};

export const uploadVideoToCloudinary = (buffer, folder = "secondhand-marketplace/products") => {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: "video",
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      Readable.from(buffer).pipe(uploadStream);
    });
  };

export const deleteFromCloudinary = (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

export default cloudinary;
