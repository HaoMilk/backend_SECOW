import { body, validationResult } from "express-validator";

export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      message: "Dữ liệu không hợp lệ",
      errors: errors.array(),
    });
  };
};

export const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Tên là bắt buộc")
    .isLength({ min: 2 })
    .withMessage("Tên phải có ít nhất 2 ký tự"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Email không hợp lệ")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Mật khẩu phải có ít nhất 8 ký tự")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Mật khẩu phải chứa chữ hoa, chữ thường và số"),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Số điện thoại là bắt buộc")
    .matches(/^[0-9]{10,11}$/)
    .withMessage("Số điện thoại phải có 10-11 chữ số"),
  body("dateOfBirth")
    .notEmpty()
    .withMessage("Ngày sinh là bắt buộc")
    .isISO8601()
    .withMessage("Ngày sinh không hợp lệ")
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= 16;
      }
      return age >= 16;
    })
    .withMessage("Bạn phải đủ 16 tuổi trở lên để đăng ký"),
];

export const verifyOTPValidation = [
  body("email").trim().isEmail().withMessage("Email không hợp lệ"),
  body("code")
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage("Mã OTP phải có 6 chữ số")
    .isNumeric()
    .withMessage("Mã OTP phải là số"),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Tên là bắt buộc")
    .isLength({ min: 2 })
    .withMessage("Tên phải có ít nhất 2 ký tự"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Mật khẩu phải có ít nhất 8 ký tự")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Mật khẩu phải chứa chữ hoa, chữ thường và số"),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Số điện thoại là bắt buộc")
    .matches(/^[0-9]{10,11}$/)
    .withMessage("Số điện thoại phải có 10-11 chữ số"),
  body("dateOfBirth")
    .notEmpty()
    .withMessage("Ngày sinh là bắt buộc")
    .isISO8601()
    .withMessage("Ngày sinh không hợp lệ")
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= 16;
      }
      return age >= 16;
    })
    .withMessage("Bạn phải đủ 16 tuổi trở lên để đăng ký"),
];

export const loginValidation = [
  body("email").trim().isEmail().withMessage("Email không hợp lệ"),
  body("password").notEmpty().withMessage("Mật khẩu là bắt buộc"),
];

export const forgotPasswordValidation = [
  body("email").trim().isEmail().withMessage("Email không hợp lệ"),
];

export const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Token là bắt buộc"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Mật khẩu phải có ít nhất 8 ký tự")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Mật khẩu phải chứa chữ hoa, chữ thường và số"),
];

