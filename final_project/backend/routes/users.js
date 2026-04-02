const express = require("express");
const router  = express.Router();
const path    = require("path");
const multer  = require("multer");
const fs      = require("fs");
const ctrl    = require("../controllers/userController");
const { authMiddleware } = require("../middleware/auth");

// ─── Avatar upload storage ─────────────────────────────────────────────────
const avatarDir = path.join(__dirname, "../uploads/avatars");
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, "avatar_" + req.user.id + "_" + Date.now() + ext);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only image files are allowed (jpg, png, gif, webp)"));
  }
});

// ─── Routes ────────────────────────────────────────────────────────────────
router.use(authMiddleware);

// Profile
router.get("/me",                        ctrl.getMe);
router.put("/me",                        ctrl.updateProfile); // also aliased as updateMe
router.put("/me/profile",                ctrl.updateProfile); // legacy compat
router.post("/me/avatar", avatarUpload.single("avatar"), ctrl.uploadAvatar);
router.put("/me/password",               ctrl.changePassword);

// Bank accounts
router.get("/bank-accounts",             ctrl.getBankAccounts);
router.post("/bank-accounts",            ctrl.addBankAccount);
router.put("/bank-accounts/:id",         ctrl.updateBankAccount);
router.delete("/bank-accounts/:id",      ctrl.deleteBankAccount);

module.exports = router;