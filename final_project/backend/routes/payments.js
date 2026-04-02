const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/paymentController");
const db = require("../config/database");
const { authMiddleware } = require("../middleware/auth");
const { validate, initiatePaymentRules, imageFileFilter } = require("../middleware/validation");
const multer = require("multer");
const fs = require("fs");

const bkStore = multer.diskStorage({
  destination: (r, f, cb) => {
    const d = "uploads/bank_transfers";
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    cb(null, d);
  },
  filename: (r, f, cb) => cb(null, Date.now() + "_" + f.originalname.replace(/[^a-zA-Z0-9._-]/g, "_"))
});
const bkUp = multer({ storage: bkStore, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ── Webhooks (raw body needed for signature verification) ──
// NOTE: server.js must expose req.rawBody — see rawBody middleware setup there
router.post("/webhook/paystack", ctrl.webhookPaystack);
router.post("/webhook/flutterwave", ctrl.webhookFlutterwave);
router.post("/webhook/stripe", ctrl.webhookStripe);

// ── Public (no auth needed) ──
router.get("/gateways", ctrl.getGateways);
router.get("/template-gateways", ctrl.getTemplateGateways);
router.get("/verify/paystack", ctrl.verifyPaystack);
router.get("/verify/flutterwave", ctrl.verifyFlutterwave);
router.post("/template-bank-proof", bkUp.single("proof"), ctrl.uploadTemplateBankProof);

// ── Check if user owns an item (used by school-site pages) ──
router.get("/check-purchase", authMiddleware, async (req, res) => {
  try {
    const { type, id } = req.query;
    if (!type || !id) return res.status(400).json({ message: "type and id required" });
    const [rows] = await db.query(
      "SELECT id FROM user_purchases WHERE user_id=? AND item_type=? AND item_id=?",
      [req.user.id, type, id]
    );
    res.json({ purchased: rows.length > 0 });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Admin: approve bank transfer ──
router.patch("/bank-transfers/:id/approve", authMiddleware, async (req, res) => {
  try {
    const db = require("../config/database");
    const emailService = require("../services/emailService");
    const [orders] = await db.query("SELECT * FROM orders WHERE id=?", [req.params.id]);
    if (!orders[0]) return res.status(404).json({ message: "Order not found" });
    const order = orders[0];
    // Finalize payment
    await ctrl._finalizePayment(order, "bank_transfer");
    // Send approval email to student
    try {
      const [userRows] = await db.query("SELECT id,name,email,site_id FROM users WHERE id=? LIMIT 1", [order.user_id]);
      const user = userRows[0];
      if (user) {
        let itemTitle = "your purchase";
        if (order.item_type === "course") {
          const [cRows] = await db.query("SELECT title FROM courses WHERE id=? LIMIT 1", [order.item_id]);
          if (cRows[0]) itemTitle = cRows[0].title;
        } else if (order.item_type === "past_question") {
          const [pRows] = await db.query("SELECT title FROM past_questions WHERE id=? LIMIT 1", [order.item_id]);
          if (pRows[0]) itemTitle = pRows[0].title;
        }
        emailService.sendBankTransferApproved(user, itemTitle, order.site_id).catch(() => {});
        // In-app notification
        await db.query(
          "INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
          [user.id, "✅ Payment Approved!", `Your bank transfer for "${itemTitle}" has been approved. You now have access.`, "success"]
        );
      }
    } catch (_) {}
    res.json({ ok: true, message: "Bank transfer approved and access granted" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch("/bank-transfers/:id/reject", authMiddleware, async (req, res) => {
  try {
    const db = require("../config/database");
    const emailService = require("../services/emailService");
    const { reason } = req.body;
    const [orders] = await db.query("SELECT * FROM orders WHERE id=?", [req.params.id]);
    await db.query("UPDATE orders SET payment_status='failed' WHERE id=?", [req.params.id]);
    // Send rejection email to student
    if (orders[0]) {
      try {
        const [userRows] = await db.query("SELECT id,name,email,site_id FROM users WHERE id=? LIMIT 1", [orders[0].user_id]);
        const user = userRows[0];
        if (user) {
          let itemTitle = "your purchase";
          if (orders[0].item_type === "course") {
            const [cRows] = await db.query("SELECT title FROM courses WHERE id=? LIMIT 1", [orders[0].item_id]);
            if (cRows[0]) itemTitle = cRows[0].title;
          } else if (orders[0].item_type === "past_question") {
            const [pRows] = await db.query("SELECT title FROM past_questions WHERE id=? LIMIT 1", [orders[0].item_id]);
            if (pRows[0]) itemTitle = pRows[0].title;
          }
          emailService.sendBankTransferRejected(user, itemTitle, reason || null, orders[0].site_id).catch(() => {});
          await db.query(
            "INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
            [user.id, "❌ Bank Transfer Not Approved", `Your bank transfer for "${itemTitle}" was not approved. Please contact support or try again.`, "error"]
          );
        }
      } catch (_) {}
    }
    res.json({ ok: true, message: "Bank transfer rejected" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Authenticated ──
router.post("/initiate", authMiddleware, initiatePaymentRules, validate, ctrl.initiate);
router.get("/my-transactions", authMiddleware, ctrl.getMyOrders);
router.post("/verify", authMiddleware, ctrl.verifyInline);
router.post("/bank-proof", authMiddleware, bkUp.single("proof"), ctrl.uploadBankProof);
router.post("/enroll-free", authMiddleware, ctrl.enrollFree);
router.post("/upload-proof", authMiddleware, bkUp.single("proof"), ctrl.uploadProof);

module.exports = router;

// ── Subscription payment initiate ─────────────────────────────────────────────
// Called when an admin wants to pay for a subscription plan
router.post("/subscribe/initiate", authMiddleware, async (req, res) => {
  try {
    const { plan_id, gateway } = req.body;
    if (!plan_id || !gateway) return res.status(400).json({ message: "plan_id and gateway required" });

    const db = require("../config/database");
    const axios = require("axios");
    const { v4: uuidv4 } = require("uuid");

    // Get the plan
    const [plans] = await db.query("SELECT * FROM subscription_plans WHERE id=? AND is_active=1 LIMIT 1", [plan_id]);
    if (!plans[0]) return res.status(404).json({ message: "Plan not found" });
    const plan = plans[0];

    const ref = "SUB-" + uuidv4().slice(0, 12).toUpperCase();
    const adminId = req.user.id;

    // Record pending subscription payment
    await db.query(
      `INSERT INTO orders (user_id, site_id, order_ref, item_type, item_id, amount, payment_gateway, payment_status)
       VALUES (?, NULL, ?, 'subscription', ?, ?, ?, 'pending')`,
      [adminId, ref, plan_id, plan.price, gateway]
    );

    // Get platform gateway keys (admin_id IS NULL = super admin platform keys)
    const [gwRows] = await db.query(
      "SELECT * FROM payment_settings WHERE gateway=? AND admin_id IS NULL LIMIT 1",
      [gateway]
    );
    const gwConfig = gwRows[0];

    if (gateway === "bank_transfer") {
      const [bankRows] = await db.query(
        "SELECT * FROM payment_settings WHERE gateway='bank_transfer' AND admin_id IS NULL LIMIT 1"
      );
      return res.json({
        ok: true, order_ref: ref, bank_transfer: true,
        bank_details: bankRows[0] || null,
        plan: { name: plan.name, price: plan.price }
      });
    }

    if (gateway === "paystack") {
      const secret = gwConfig?.secret_key_encrypted || process.env.PAYSTACK_SECRET_KEY;
      if (!secret) return res.status(400).json({ message: "Paystack not configured on platform" });
      const resp = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: req.user.email,
          amount: Math.round(plan.price * 100),
          reference: ref,
          callback_url: `${process.env.APP_URL}/api/payments/subscribe/verify`,
          metadata: { order_ref: ref, plan_id, admin_id: adminId, plan_name: plan.name }
        },
        { headers: { Authorization: `Bearer ${secret}` } }
      );
      return res.json({ ok: true, order_ref: ref, authorization_url: resp.data.data.authorization_url });
    }

    if (gateway === "flutterwave") {
      const secret = gwConfig?.secret_key_encrypted || process.env.FLUTTERWAVE_SECRET_KEY;
      if (!secret) return res.status(400).json({ message: "Flutterwave not configured on platform" });
      const resp = await axios.post(
        "https://api.flutterwave.com/v3/payments",
        {
          tx_ref: ref,
          amount: plan.price,
          currency: "NGN",
          redirect_url: `${process.env.APP_URL}/api/payments/subscribe/verify?ref=${ref}`,
          customer: { email: req.user.email },
          meta: { order_ref: ref, plan_id, plan_name: plan.name }
        },
        { headers: { Authorization: `Bearer ${secret}` } }
      );
      return res.json({ ok: true, order_ref: ref, authorization_url: resp.data.data.link });
    }

    if (gateway === "stripe") {
      const secret = gwConfig?.secret_key_encrypted || process.env.STRIPE_SECRET_KEY;
      if (!secret) return res.status(400).json({ message: "Stripe not configured on platform" });
      const resp = await axios.post(
        "https://api.stripe.com/v1/checkout/sessions",
        new URLSearchParams({
          "payment_method_types[0]": "card",
          "line_items[0][price_data][currency]": "ngn",
          "line_items[0][price_data][product_data][name]": plan.name + " Plan",
          "line_items[0][price_data][unit_amount]": Math.round(plan.price * 100),
          "line_items[0][quantity]": "1",
          "mode": "payment",
          "success_url": `${process.env.APP_URL}/api/payments/subscribe/verify?ref=${ref}`,
          "cancel_url": `${process.env.APP_URL}/admin/subscribe?cancelled=1`,
          "client_reference_id": ref,
          "metadata[order_ref]": ref,
          "metadata[plan_id]": plan_id,
        }),
        { headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" } }
      );
      return res.json({ ok: true, order_ref: ref, authorization_url: resp.data.url });
    }

    res.status(400).json({ message: "Unsupported gateway" });
  } catch (e) {
    console.error("[subscribe/initiate]", e.response?.data || e.message);
    res.status(500).json({ message: e.response?.data?.message || e.message });
  }
});

// ── Subscription payment verify & activate ────────────────────────────────────
router.get("/subscribe/verify", async (req, res) => {
  try {
    const ref = req.query.reference || req.query.ref || req.query.trxref;
    if (!ref) return res.redirect("/admin/subscribe?error=missing_ref");

    const db = require("../config/database");

    const [orders] = await db.query(
      "SELECT * FROM orders WHERE order_ref=? AND item_type='subscription' LIMIT 1",
      [ref]
    );
    if (!orders[0]) return res.redirect("/admin/subscribe?error=order_not_found");
    const order = orders[0];

    if (order.payment_status === "success") {
      return res.redirect("/admin?subscribed=1");
    }

    // Mark order paid
    await db.query(
      "UPDATE orders SET payment_status='success', paid_at=NOW() WHERE order_ref=?",
      [ref]
    );

    // Get plan details
    const [plans] = await db.query("SELECT * FROM subscription_plans WHERE id=? LIMIT 1", [order.item_id]);
    const plan = plans[0];
    if (!plan) return res.redirect("/admin/subscribe?error=plan_not_found");

    // Calculate expiry based on interval
    const now = new Date();
    let expiry = new Date(now);
    if (plan.interval === "year") expiry.setFullYear(expiry.getFullYear() + 1);
    else if (plan.interval === "quarter") expiry.setMonth(expiry.getMonth() + 3);
    else expiry.setMonth(expiry.getMonth() + 1); // default monthly
    const expiryStr = expiry.toISOString().split("T")[0];

    // Upsert subscription (use most recent row for this admin)
    const [existing] = await db.query(
      "SELECT id FROM admin_subscriptions WHERE admin_id=? ORDER BY id DESC LIMIT 1",
      [order.user_id]
    );
    if (existing[0]) {
      await db.query(
        "UPDATE admin_subscriptions SET plan=?, status='active', expires_at=?, payment_ref=?, updated_at=NOW() WHERE id=?",
        [plan.name, expiryStr, ref, existing[0].id]
      );
    } else {
      await db.query(
        "INSERT INTO admin_subscriptions (admin_id, plan, status, expires_at, payment_ref) VALUES (?,?,?,?,?)",
        [order.user_id, plan.name, "active", expiryStr, ref]
      );
    }

    // In-app notification
    await db.query(
      "INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
      [order.user_id, "🎉 Subscription Activated!",
       `Your ${plan.name} plan is now active until ${new Date(expiryStr).toLocaleDateString("en-NG", {day:"numeric",month:"long",year:"numeric"})}.`,
       "success"]
    ).catch(() => {});

    // Send email
    try {
      const emailService = require("../services/emailService");
      const [userRows] = await db.query("SELECT id,name,email FROM users WHERE id=? LIMIT 1", [order.user_id]);
      if (userRows[0]) emailService.sendSubscriptionActivated(userRows[0], plan.name, expiryStr).catch(() => {});
    } catch (_) {}

    // Clear subscription cache so new plan limits take effect immediately
    try {
      const { clearPlanCache } = require('../middleware/subscriptionMiddleware');
      clearPlanCache(order.user_id);
    } catch (_) {}

    res.redirect("/admin?subscribed=1");
  } catch (e) {
    console.error("[subscribe/verify]", e.message);
    res.redirect("/admin/subscribe?error=server_error");
  }
});

// ── Bank transfer proof for subscription ──────────────────────────────────────
router.post("/subscribe/bank-proof", authMiddleware, bkUp.single("proof"), async (req, res) => {
  try {
    const db = require("../config/database");
    const { order_ref } = req.body;
    if (!req.file || !order_ref) return res.status(400).json({ message: "proof and order_ref required" });
    const proof = "/uploads/bank_transfers/" + req.file.filename;
    await db.query(
      "UPDATE orders SET bank_transfer_proof=?, payment_status='awaiting_approval' WHERE order_ref=? AND user_id=?",
      [proof, order_ref, req.user.id]
    );
    // Notify super admin
    await db.query(
      "INSERT INTO notifications (user_id, title, message, type) SELECT id,'💳 Subscription Payment Submitted',CONCAT((SELECT name FROM users WHERE id=?),' submitted bank transfer proof for a subscription. Please verify.') ,'info' FROM users WHERE role_id=4",
      [req.user.id]
    ).catch(() => {});
    res.json({ ok: true, message: "Proof uploaded. Your subscription will be activated after verification." });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
