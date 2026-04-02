const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/authController");
const { authMiddleware } = require("../middleware/auth");
const {
  validate,
  registerRules,
  loginRules,
  otpRules,
  forgotPasswordRules,
  resetPasswordRules,
} = require("../middleware/validation");

router.post("/register", registerRules, validate, ctrl.register);
router.post("/verify-otp", otpRules, validate, ctrl.verifyOTP);
router.post("/resend-otp", forgotPasswordRules, validate, ctrl.resendOTP);
router.post("/login", loginRules, validate, ctrl.login);
router.post("/verify-login-otp", otpRules, validate, ctrl.verifyLoginOTP);
router.post("/forgot-password", forgotPasswordRules, validate, ctrl.forgotPassword);
router.post("/reset-password", resetPasswordRules, validate, ctrl.resetPassword);
router.get("/me", authMiddleware, ctrl.getMe);

module.exports = router;