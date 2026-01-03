import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";

// Function to ensure Cloudinary is configured
const ensureCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("Cloudinary environment variables missing:");
    console.error("CLOUDINARY_CLOUD_NAME:", cloudName ? "✓ Set" : "✗ Missing");
    console.error("CLOUDINARY_API_KEY:", apiKey ? "✓ Set" : "✗ Missing");
    console.error("CLOUDINARY_API_SECRET:", apiSecret ? "✓ Set" : "✗ Missing");
    throw new Error("Cloudinary configuration is missing. Please check your .env file.");
  }

  // Reconfigure to ensure latest env vars are used
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  return true;
};

// Initial config attempt
try {
  ensureCloudinaryConfig();
  console.log("Cloudinary configured successfully");
} catch (error) {
  console.warn("Cloudinary initial config failed:", error.message);
  console.warn("Will retry when uploadToCloudinary is called");
}

// Memory storage cho multer
const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB (for video support)
  },
  fileFilter: (req, file, cb) => {
    // Check if it's an image field
    if (file.fieldname === "images") {
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
    } 
    // Check if it's a video field
    else if (file.fieldname === "video") {
      const allowedTypes = /mp4|webm|ogg/;
      const extname = allowedTypes.test(
        file.originalname.toLowerCase().split(".").pop()
      );
      const mimetype = /video\/(mp4|webm|ogg)/.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error("Chỉ cho phép upload file video (mp4, webm, ogg)"));
      }
    } else {
      cb(new Error("Field name không hợp lệ"));
    }
  },
});

// Helper function để upload buffer lên Cloudinary
export const uploadToCloudinary = (buffer, folder = "secondhand-marketplace", resourceType = "image") => {
  return new Promise((resolve, reject) => {
    // Ensure Cloudinary is configured before upload
    try {
      ensureCloudinaryConfig();
    } catch (error) {
      return reject(error);
    }

    if (!buffer || buffer.length === 0) {
      return reject(new Error("Buffer is empty or invalid"));
    }

    console.log(`Uploading to Cloudinary - Folder: ${folder}, ResourceType: ${resourceType}, Buffer size: ${buffer.length} bytes`);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: resourceType,
        ...(resourceType === "image" ? {
          transformation: [
            {
              width: 1200,
              height: 1200,
              crop: "limit",
              quality: "auto",
            },
          ],
        } : {}),
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(error);
        }
        console.log("Cloudinary upload success:", result?.secure_url || result?.url);
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

