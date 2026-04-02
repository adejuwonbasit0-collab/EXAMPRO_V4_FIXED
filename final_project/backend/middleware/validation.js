/**
 * validation.js — Input validation middleware using express-validator
 * Applied to routes to sanitize and validate all inputs before they
 * reach controllers. Prevents injection, bad data, and crashes.
 */

const { body, param, query, validationResult } = require("express-validator");

/** Run validation and return 400 if any errors */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

// ── AUTH VALIDATORS ──────────────────────────────────────────

const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 2, max: 100 }).withMessage("Name must be 2–100 characters").escape(),
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 6, max: 100 }).withMessage("Password must be at least 6 characters"),
  body("role").optional().isIn(["student", "instructor", "admin"]).withMessage("Invalid role"),
  body("school_name").optional().trim().isLength({ max: 150 }).escape(),
  body("subdomain").optional().trim().isAlphanumeric("en-US", { ignore: "-" }).isLength({ min: 3, max: 50 }).withMessage("Subdomain must be 3–50 alphanumeric characters"),
];

const loginRules = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const otpRules = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("otp").trim().notEmpty().withMessage("OTP is required").isLength({ min: 4, max: 8 }),
];

const forgotPasswordRules = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
];

const resetPasswordRules = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("otp").trim().notEmpty().withMessage("OTP is required"),
  body("newPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

// ── PAYMENT VALIDATORS ───────────────────────────────────────

const initiatePaymentRules = [
  body("item_type").isIn(["course", "past_question", "template"]).withMessage("Invalid item_type"),
  body("item_id").isInt({ min: 1 }).withMessage("Valid item_id required"),
  body("gateway").optional().isIn(["paystack", "flutterwave", "stripe", "bank_transfer"]).withMessage("Invalid gateway"),
  body("site_id").optional().isInt({ min: 1 }),
];

const webhookPaystackRules = [
  // Raw body needed — no body validation, but we can validate event header presence
];

// ── COURSE VALIDATORS ────────────────────────────────────────

const reviewRules = [
  param("id").isInt({ min: 1 }).withMessage("Valid course ID required"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1–5"),
  body("review").optional().trim().isLength({ max: 2000 }).escape(),
];

const discussionRules = [
  param("id").isInt({ min: 1 }).withMessage("Valid course ID required"),
  body("message").trim().notEmpty().withMessage("Message is required").isLength({ max: 2000 }),
  body("parent_id").optional().isInt({ min: 1 }),
];

// ── CHAT VALIDATORS ──────────────────────────────────────────

const chatMessageRules = [
  param("roomId").isInt({ min: 1 }).withMessage("Valid room ID required"),
  body("message").trim().notEmpty().withMessage("Message is required").isLength({ max: 5000 }),
];

// ── GENERAL ──────────────────────────────────────────────────

const idParamRules = [
  param("id").isInt({ min: 1 }).withMessage("Valid numeric ID required"),
];

const paginationRules = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
];

// ── FILE UPLOAD FILTER (multer fileFilter) ───────────────────

/** Only allow images */
const imageFileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed"), false);
  }
};

/** Only allow PDF files */
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

/** Allow PDF or images (for certificates, documents) */
const pdfOrImageFilter = (req, file, cb) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF or image files are allowed"), false);
  }
};

/** Allow video files */
const videoFileFilter = (req, file, cb) => {
  const allowed = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only video files (MP4, WebM, OGG, MOV, AVI) are allowed"), false);
  }
};

module.exports = {
  validate,
  registerRules,
  loginRules,
  otpRules,
  forgotPasswordRules,
  resetPasswordRules,
  initiatePaymentRules,
  reviewRules,
  discussionRules,
  chatMessageRules,
  idParamRules,
  paginationRules,
  imageFileFilter,
  pdfFileFilter,
  pdfOrImageFilter,
  videoFileFilter,
};