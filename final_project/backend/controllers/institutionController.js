const db = require("../config/database");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/institutions";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `inst_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });
exports.uploadLogo = upload.single("logo");

// GET ALL INSTITUTIONS
exports.getAll = async (req, res) => {
  try {
    const { type, search, page = 1, limit = 20 } = req.query;
    let query = "SELECT * FROM institutions WHERE is_active = TRUE";
    const params = [];

    if (type) { query += " AND type = ?"; params.push(type); }
    if (search) { query += " AND name LIKE ?"; params.push(`%${search}%`); }

    query += " ORDER BY name ASC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await db.query(query, params);
    const [[{ total }]] = await db.query("SELECT COUNT(*) as total FROM institutions WHERE is_active = TRUE");

    res.json({ institutions: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch institutions" });
  }
};

// GET ONE INSTITUTION
exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM institutions WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Institution not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch institution" });
  }
};

// CREATE INSTITUTION (admin only)
exports.create = async (req, res) => {
  try {
    const { name, short_name, description, type, country, state, website } = req.body;
    if (!name || !short_name || !type)
      return res.status(400).json({ message: "Name, short name, and type are required" });

    const logo = req.file ? `/uploads/institutions/${req.file.filename}` : null;

    const [result] = await db.query(
      "INSERT INTO institutions (name, short_name, description, type, country, state, website, logo, created_by) VALUES (?,?,?,?,?,?,?,?,?)",
      [name, short_name, description, type, country || "Nigeria", state, website, logo, req.user.id]
    );

    res.status(201).json({ message: "Institution created successfully", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create institution" });
  }
};

// UPDATE INSTITUTION
exports.update = async (req, res) => {
  try {
    const { name, short_name, description, type, country, state, website, is_active } = req.body;
    const logo = req.file ? `/uploads/institutions/${req.file.filename}` : undefined;

    let query = "UPDATE institutions SET name=?, short_name=?, description=?, type=?, country=?, state=?, website=?, is_active=?";
    const params = [name, short_name, description, type, country, state, website, is_active !== undefined ? is_active : true];

    if (logo) { query += ", logo=?"; params.push(logo); }
    query += " WHERE id=?";
    params.push(req.params.id);

    await db.query(query, params);
    res.json({ message: "Institution updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update institution" });
  }
};

// DELETE INSTITUTION
exports.delete = async (req, res) => {
  try {
    await db.query("UPDATE institutions SET is_active = FALSE WHERE id = ?", [req.params.id]);
    res.json({ message: "Institution deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete institution" });
  }
};
