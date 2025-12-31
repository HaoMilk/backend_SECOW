import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import connectDB from "../config/db.js";

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    // Xóa dữ liệu cũ (optional - chỉ dùng trong development)
    if (process.env.NODE_ENV === "development") {
      console.log("Clearing old data...");
      await User.deleteMany({});
      await Category.deleteMany({});
      await Product.deleteMany({});
      await Store.deleteMany({});
    }

    // Tạo Admin
    const admin = await User.create({
      name: "Admin",
      email: "admin@example.com",
      password: "Admin123",
      role: "admin",
      isEmailVerified: true,
      isActive: true,
    });
    console.log("Admin created:", admin.email);

    // Tạo Seller
    const seller1 = await User.create({
      name: "Nguyễn Văn Bán",
      email: "seller1@example.com",
      password: "Seller123",
      role: "seller",
      isEmailVerified: true,
      isActive: true,
      phone: "0123456789",
    });

    const seller2 = await User.create({
      name: "Trần Thị Bán",
      email: "seller2@example.com",
      password: "Seller123",
      role: "seller",
      isEmailVerified: true,
      isActive: true,
      phone: "0987654321",
    });
    console.log("Sellers created");

    // Tạo Store cho sellers
    const store1 = await Store.create({
      seller: seller1._id,
      storeName: "Cửa hàng đồ cũ số 1",
      description: "Chuyên bán đồ điện tử cũ",
      address: "123 Đường ABC, Quận 1, TP.HCM",
      phone: "0123456789",
      email: "seller1@example.com",
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: admin._id,
    });

    const store2 = await Store.create({
      seller: seller2._id,
      storeName: "Shop quần áo secondhand",
      description: "Quần áo secondhand chất lượng cao",
      address: "456 Đường XYZ, Quận 2, TP.HCM",
      phone: "0987654321",
      email: "seller2@example.com",
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: admin._id,
    });
    console.log("Stores created");

    // Tạo Categories
    const categories = await Category.insertMany([
      {
        name: "Quần áo",
        slug: "quan-ao",
        description: "Quần áo nam nữ",
        order: 1,
      },
      {
        name: "Giày dép",
        slug: "giay-dep",
        description: "Giày dép các loại",
        order: 2,
      },
      {
        name: "Phụ kiện",
        slug: "phu-kien",
        description: "Túi xách, ví, đồng hồ...",
        order: 3,
      },
      {
        name: "Đồ điện tử",
        slug: "do-dien-tu",
        description: "Điện thoại, laptop, máy tính...",
        order: 4,
      },
      {
        name: "Đồ gia dụng",
        slug: "do-gia-dung",
        description: "Đồ dùng trong nhà",
        order: 5,
      },
      {
        name: "Khác",
        slug: "khac",
        description: "Các mặt hàng khác",
        order: 6,
      },
    ]);
    console.log("Categories created:", categories.length);

    // Tạo Products
    const products = await Product.insertMany([
      {
        title: "Áo thun nam cũ",
        description: "Áo thun nam size M, còn mới 80%",
        price: 50000,
        images: [],
        condition: "Tốt",
        categoryId: categories[0].slug,
        seller: seller1._id,
        sellerName: seller1.name,
        location: "TP.HCM",
        stock: 5,
        status: "active",
      },
      {
        title: "Giày thể thao Nike",
        description: "Giày Nike size 42, đã qua sử dụng",
        price: 500000,
        images: [],
        condition: "Khá",
        categoryId: categories[1].slug,
        seller: seller1._id,
        sellerName: seller1.name,
        location: "TP.HCM",
        stock: 2,
        status: "active",
      },
      {
        title: "Laptop Dell cũ",
        description: "Laptop Dell Inspiron, RAM 8GB, SSD 256GB",
        price: 5000000,
        images: [],
        condition: "Tốt",
        categoryId: categories[3].slug,
        seller: seller2._id,
        sellerName: seller2.name,
        location: "TP.HCM",
        stock: 1,
        status: "active",
      },
      {
        title: "Quần jean nữ",
        description: "Quần jean size 28, còn mới",
        price: 200000,
        images: [],
        condition: "Like New",
        categoryId: categories[0].slug,
        seller: seller2._id,
        sellerName: seller2.name,
        location: "TP.HCM",
        stock: 3,
        status: "active",
      },
    ]);
    console.log("Products created:", products.length);

    // Tạo Customer mẫu
    const customer = await User.create({
      name: "Khách hàng mẫu",
      email: "customer@example.com",
      password: "Customer123",
      role: "user",
      isEmailVerified: true,
      isActive: true,
      phone: "0901234567",
    });
    console.log("Customer created:", customer.email);

    console.log("\n✅ Seed data created successfully!");
    console.log("\nLogin credentials:");
    console.log("Admin: admin@example.com / Admin123");
    console.log("Seller 1: seller1@example.com / Seller123");
    console.log("Seller 2: seller2@example.com / Seller123");
    console.log("Customer: customer@example.com / Customer123");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();

