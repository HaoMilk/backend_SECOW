import nodemailer from "nodemailer";

const createTransporter = () => {
  // Kiểm tra cấu hình email
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "Email chưa được cấu hình. Vui lòng thiết lập EMAIL_USER và EMAIL_PASS trong file .env"
    );
  }

  // Sử dụng Gmail hoặc SMTP server khác
  // Cần cấu hình trong .env: EMAIL_USER, EMAIL_PASS
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // App password cho Gmail
    },
  });
};

export const sendOTPEmail = async (email, code, purpose = "email_verification") => {
  try {
    const transporter = createTransporter();

    const subject =
      purpose === "email_verification"
        ? "Mã xác thực đăng ký tài khoản"
        : "Mã xác thực đặt lại mật khẩu";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #10b981;">Xác thực tài khoản</h2>
        <p>Xin chào,</p>
        <p>Mã xác thực của bạn là:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #10b981; font-size: 32px; letter-spacing: 8px; margin: 0;">${code}</h1>
        </div>
        <p>Mã này có hiệu lực trong <strong>10 phút</strong>.</p>
        <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">Đây là email tự động, vui lòng không trả lời.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"SecondLife" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    
    // Phân loại lỗi để có thông báo rõ ràng hơn
    if (error.code === "EAUTH" || error.responseCode === 535) {
      throw new Error(
        "Lỗi xác thực email. Vui lòng kiểm tra EMAIL_USER và EMAIL_PASS trong file .env. " +
        "Đảm bảo bạn đã tạo App Password từ Google Account."
      );
    } else if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
      throw new Error("Không thể kết nối đến server email. Vui lòng kiểm tra kết nối mạng.");
    } else {
      throw new Error(`Không thể gửi email: ${error.message || "Vui lòng thử lại sau."}`);
    }
  }
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `"SecondLife" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Đặt lại mật khẩu",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">Đặt lại mật khẩu</h2>
          <p>Xin chào,</p>
          <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấp vào liên kết bên dưới để đặt lại:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Đặt lại mật khẩu</a>
          </div>
          <p>Liên kết này có hiệu lực trong <strong>1 giờ</strong>.</p>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">Đây là email tự động, vui lòng không trả lời.</p>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Không thể gửi email. Vui lòng thử lại sau.");
  }
};

