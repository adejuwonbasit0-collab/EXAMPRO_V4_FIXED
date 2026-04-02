/**
 * models/index.js — Reusable DB query helpers (thin model layer)
 * These are functions rather than full ORMs to keep things simple
 * and compatible with the existing mysql2 setup.
 */

const db = require("../config/database");

// ── Users ────────────────────────────────────────────────────

const UserModel = {
  findById: (id) => db.query("SELECT * FROM users WHERE id=? LIMIT 1", [id]).then(([r]) => r[0] || null),
  findByEmail: (email, siteId = null) =>
    db.query("SELECT * FROM users WHERE email=? AND site_id<=>? LIMIT 1", [email, siteId]).then(([r]) => r[0] || null),
  findBySiteId: (siteId, roleId = null) => {
    const params = [siteId];
    let q = "SELECT id,name,email,role_id,is_active,is_approved,created_at FROM users WHERE site_id=?";
    if (roleId) { q += " AND role_id=?"; params.push(roleId); }
    return db.query(q, params).then(([r]) => r);
  },
  update: (id, fields) => {
    const keys = Object.keys(fields).map(k => `${k}=?`).join(",");
    const vals = [...Object.values(fields), id];
    return db.query(`UPDATE users SET ${keys} WHERE id=?`, vals);
  },
};

// ── Sites ────────────────────────────────────────────────────

const SiteModel = {
  findByUserId: (userId) =>
    db.query("SELECT * FROM admin_sites WHERE user_id=? LIMIT 1", [userId]).then(([r]) => r[0] || null),
  findById: (id) =>
    db.query("SELECT * FROM admin_sites WHERE id=? LIMIT 1", [id]).then(([r]) => r[0] || null),
  findBySubdomain: (subdomain) =>
    db.query("SELECT * FROM admin_sites WHERE subdomain=? AND is_active=1 LIMIT 1", [subdomain]).then(([r]) => r[0] || null),
};

// ── Orders ───────────────────────────────────────────────────

const OrderModel = {
  findByRef: (ref) =>
    db.query("SELECT * FROM orders WHERE order_ref=? LIMIT 1", [ref]).then(([r]) => r[0] || null),
  findByUserId: (userId) =>
    db.query("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC", [userId]).then(([r]) => r),
  markPaid: (id, gateway) =>
    db.query("UPDATE orders SET payment_status='success',paid_at=NOW(),payment_gateway=? WHERE id=?", [gateway, id]),
};

// ── Notifications ────────────────────────────────────────────

const NotificationModel = {
  create: (userId, title, message, type = "info") =>
    db.query("INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)", [userId, title, message, type]),
  getByUserId: (userId, limit = 20) =>
    db.query("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT ?", [userId, limit]).then(([r]) => r),
  markRead: (id, userId) =>
    db.query("UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?", [id, userId]),
  markAllRead: (userId) =>
    db.query("UPDATE notifications SET is_read=1 WHERE user_id=?", [userId]),
};

// ── Subscriptions ────────────────────────────────────────────

const SubscriptionModel = {
  findByAdminId: (adminId) =>
    db.query("SELECT * FROM admin_subscriptions WHERE admin_id=? ORDER BY created_at DESC LIMIT 1", [adminId]).then(([r]) => r[0] || null),
  isActive: async (adminId) => {
    const sub = await SubscriptionModel.findByAdminId(adminId);
    if (!sub) return false;
    return sub.status === "active" && new Date(sub.expires_at) > new Date();
  },
  create: (adminId, plan, expiresAt, paymentRef = null) =>
    db.query(
      "INSERT INTO admin_subscriptions (admin_id,plan,status,expires_at,payment_ref) VALUES (?,?,'active',?,?)",
      [adminId, plan, expiresAt, paymentRef]
    ),
  cancel: (adminId) =>
    db.query("UPDATE admin_subscriptions SET status='cancelled' WHERE admin_id=?", [adminId]),
};

module.exports = { UserModel, SiteModel, OrderModel, NotificationModel, SubscriptionModel };
