export const generateOTP = () => {
  // Tạo mã OTP 6 chữ số
  return Math.floor(100000 + Math.random() * 900000).toString();
};

