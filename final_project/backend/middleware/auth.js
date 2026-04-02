const jwt = require("jsonwebtoken");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "No token provided" });
  try {
    req.user = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Super Admin only (role_id = 4)
const superAdminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role_id !== 4)
    return res.status(403).json({ message: "Super admin access required" });
  next();
};

// Admin or Super Admin (role_id = 2 or 4)
const adminMiddleware = (req, res, next) => {
  if (!req.user || ![2, 4].includes(req.user.role_id))
    return res.status(403).json({ message: "Admin access required" });
  next();
};

// Instructor, Admin, or Super Admin (role_id = 2, 3, or 4)
const instructorMiddleware = (req, res, next) => {
  if (!req.user || ![2, 3, 4].includes(req.user.role_id))
    return res.status(403).json({ message: "Instructor access required" });
  next();
};

module.exports = { authMiddleware, superAdminMiddleware, adminMiddleware, instructorMiddleware };
