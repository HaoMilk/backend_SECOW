import User from "../models/User.js";
import OTP from "../models/OTP.js";
import { generateOTP } from "../utils/generateOTP.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";
import { sendOTPEmail, sendPasswordResetEmail } from "../services/emailService.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import asyncHandler from "../middleware/asyncHandler.js";

// Đăng ký - Gửi OTP
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    // Tạo mã OTP
    const otpCode = generateOTP();

    // Xóa OTP cũ của cùng email và purpose (nếu có)
    await OTP.deleteMany({
      email,
      purpose: "email_verification",
    });

    // Lưu OTP vào database
    let otpRecord;
    try {
      otpRecord = await OTP.create({
        email,
        code: otpCode,
        purpose: "email_verification",
      });
    } catch (dbError) {
      console.error("Database error when creating OTP:", dbError);
      console.error("Error details:", dbError);
      return res.status(500).json({
        success: false,
        message: "Lỗi lưu mã OTP. Vui lòng thử lại sau.",
        error: process.env.NODE_ENV === "development" ? dbError.message : undefined,
      });
    }

    // Gửi OTP qua email
    try {
      await sendOTPEmail(email, otpCode, "email_verification");
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Xóa OTP đã tạo nếu không gửi được email
      await OTP.findByIdAndDelete(otpRecord._id);
      
      // Kiểm tra nếu là lỗi cấu hình email
      if (emailError.message?.includes("Invalid login") || 
          emailError.message?.includes("authentication failed") ||
          !process.env.EMAIL_USER || 
          !process.env.EMAIL_PASS) {
        return res.status(500).json({
          success: false,
          message: "Lỗi cấu hình email. Vui lòng kiểm tra cấu hình EMAIL_USER và EMAIL_PASS trong file .env",
          error: process.env.NODE_ENV === "development" ? emailError.message : undefined,
        });
      }
      
      return res.status(500).json({
        success: false,
        message: "Không thể gửi email OTP. Vui lòng thử lại sau.",
        error: process.env.NODE_ENV === "development" ? emailError.message : undefined,
      });
    }

    // Lưu thông tin đăng ký tạm thời (có thể dùng session hoặc cache)
    // Ở đây ta sẽ yêu cầu client gửi lại thông tin khi verify OTP
    res.status(200).json({
      success: true,
      message: "Mã OTP đã được gửi đến email của bạn",
      data: {
        email,
        // Không trả về OTP trong production
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Lỗi đăng ký. Vui lòng thử lại sau.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Xác thực OTP và hoàn tất đăng ký
export const verifyOTP = async (req, res) => {
  try {
    const { email, code, name, password } = req.body;

    // Tìm OTP hợp lệ
    const otpRecord = await OTP.findOne({
      email,
      code,
      purpose: "email_verification",
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP không hợp lệ hoặc đã hết hạn",
      });
    }

    // Kiểm tra lại email đã tồn tại chưa (phòng trường hợp đăng ký song song)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      otpRecord.isUsed = true;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    // Tạo user mới
    let user;
    try {
      user = await User.create({
        name,
        email,
        password,
        isEmailVerified: true,
      });
    } catch (userError) {
      console.error("Error creating user:", userError);
      return res.status(500).json({
        success: false,
        message: "Lỗi tạo tài khoản. Vui lòng thử lại sau.",
        error: process.env.NODE_ENV === "development" ? userError.message : undefined,
      });
    }

    // Đánh dấu OTP đã sử dụng
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Tạo tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Lưu refresh token vào user
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Lỗi xác thực. Vui lòng thử lại sau.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Gửi lại OTP
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const otpCode = generateOTP();

    await OTP.create({
      email,
      code: otpCode,
      purpose: "email_verification",
    });

    await sendOTPEmail(email, otpCode, "email_verification");

    res.status(200).json({
      success: true,
      message: "Mã OTP mới đã được gửi đến email của bạn",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể gửi OTP. Vui lòng thử lại sau.",
    });
  }
};

// Đăng nhập
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Tìm user và lấy password
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản đã bị vô hiệu hóa",
      });
    }

    // Kiểm tra password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    // Tạo tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Lưu refresh token vào user
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi đăng nhập. Vui lòng thử lại sau.",
    });
  }
};

// Quên mật khẩu - Gửi email reset
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Không tiết lộ email có tồn tại hay không (bảo mật)
      return res.status(200).json({
        success: true,
        message: "Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu",
      });
    }

    // Tạo reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordExpires = Date.now() + 3600000; // 1 giờ

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();

    // Gửi email reset password
    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (emailError) {
      // Nếu gửi email lỗi, reset lại token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      throw emailError;
    }

    res.status(200).json({
      success: true,
      message: "Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể gửi email. Vui lòng thử lại sau.",
    });
  }
};

// Đặt lại mật khẩu
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token không hợp lệ hoặc đã hết hạn",
      });
    }

    // Cập nhật mật khẩu
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi đặt lại mật khẩu. Vui lòng thử lại sau.",
    });
  }
};

// Lấy thông tin user hiện tại
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -refreshToken");

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
});

// Refresh token
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Refresh token là bắt buộc",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== token || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Refresh token không hợp lệ",
      });
    }

    // Tạo access token mới
    const accessToken = generateAccessToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        accessToken,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Refresh token không hợp lệ hoặc đã hết hạn",
    });
  }
});

// Đổi mật khẩu
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  // Kiểm tra mật khẩu hiện tại
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    return res.status(400).json({
      success: false,
      message: "Mật khẩu hiện tại không đúng",
    });
  }

  // Cập nhật mật khẩu mới
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Đổi mật khẩu thành công",
  });
});

// Cập nhật thông tin cá nhân
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, address, avatar } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (address) updateData.address = address;
  if (avatar) updateData.avatar = avatar;

  const user = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true,
  }).select("-password -refreshToken");

  res.status(200).json({
    success: true,
    message: "Cập nhật thông tin thành công",
    data: {
      user,
    },
  });
});

// Đăng xuất
export const logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.refreshToken = undefined;
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: "Đăng xuất thành công",
  });
});

