/**
 * paymentController.js
 * Full multi-gateway payment system:
 *  - Paystack (initiate + webhook verified)
 *  - Flutterwave (initiate + webhook verified)
 *  - Stripe (initiate + webhook verified)
 *  - Bank Transfer (proof upload)
 *  - Free enrollment
 *
 * Security: Orders only finalized via webhook / server-side verify.
 * Frontend payment confirmation is NOT trusted for marking paid.
 */

const db = require("../config/database");
const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const emailService = require("../services/emailService");
require("dotenv").config();

// ── Helpers ──────────────────────────────────────────────────

async function getAdminIdFromSiteId(siteId) {
  if (!siteId) return null;
  const [r] = await db.query("SELECT user_id FROM admin_sites WHERE id=? LIMIT 1", [siteId]);
  return r[0]?.user_id || null;
}

async function getSiteIdFromSubdomain(subdomain) {
  if (!subdomain) return null;
  const [r] = await db.query("SELECT id FROM admin_sites WHERE subdomain=? AND is_active=1 LIMIT 1", [subdomain]);
  return r[0]?.id || null;
}

/** Fetch admin's payment settings by siteId or adminId */
async function getAdminPaymentSettings(siteId = null, adminId = null) {
  try {
    if (!adminId && siteId) {
      adminId = await getAdminIdFromSiteId(siteId);
    }
    if (!adminId) return null;
    const [rows] = await db.query("SELECT * FROM admin_payment_settings WHERE admin_id=? LIMIT 1", [adminId]);
    return rows[0] || null;
  } catch (_) { return null; }
}

/** Get Paystack secret for a site */
async function getPaystackSecret(siteId) {
  // 1. Check admin_payment_settings (new dedicated table)
  const s = await getAdminPaymentSettings(siteId);
  if (s?.paystack_secret_key) return s.paystack_secret_key;

  // 2. Fall back to payment_settings table (what the admin UI writes to via PUT /admin/payment-settings)
  try {
    const adminId = siteId ? await getAdminIdFromSiteId(siteId) : null;
    if (adminId) {
      const [rows] = await db.query(
        "SELECT secret_key FROM payment_settings WHERE gateway='paystack' AND admin_id=? LIMIT 1",
        [adminId]
      );
      if (rows[0]?.secret_key) return rows[0].secret_key;
    }
    // 3. Global platform key in payment_settings
    const [gRows] = await db.query(
      "SELECT secret_key FROM payment_settings WHERE gateway='paystack' AND (admin_id IS NULL OR admin_id=0) LIMIT 1"
    );
    if (gRows[0]?.secret_key) return gRows[0].secret_key;
  } catch(_) {}

  // 4. .env fallback
  return process.env.PAYSTACK_SECRET_KEY || null;
}

/** Get Flutterwave secret for a site */
async function getFlutterwaveSecret(siteId) {
  const s = await getAdminPaymentSettings(siteId);
  if (s?.flutterwave_secret_key) return s.flutterwave_secret_key;

  try {
    const adminId = siteId ? await getAdminIdFromSiteId(siteId) : null;
    if (adminId) {
      const [rows] = await db.query(
        "SELECT secret_key FROM payment_settings WHERE gateway='flutterwave' AND admin_id=? LIMIT 1",
        [adminId]
      );
      if (rows[0]?.secret_key) return rows[0].secret_key;
    }
    const [gRows] = await db.query(
      "SELECT secret_key FROM payment_settings WHERE gateway='flutterwave' AND (admin_id IS NULL OR admin_id=0) LIMIT 1"
    );
    if (gRows[0]?.secret_key) return gRows[0].secret_key;
  } catch(_) {}

  return process.env.FLUTTERWAVE_SECRET_KEY || null;
}

/** Get Stripe secret for a site */
async function getStripeSecret(siteId) {
  const s = await getAdminPaymentSettings(siteId);
  if (s?.stripe_secret_key) return s.stripe_secret_key;

  try {
    const adminId = siteId ? await getAdminIdFromSiteId(siteId) : null;
    if (adminId) {
      const [rows] = await db.query(
        "SELECT secret_key FROM payment_settings WHERE gateway='stripe' AND admin_id=? LIMIT 1",
        [adminId]
      );
      if (rows[0]?.secret_key) return rows[0].secret_key;
    }
    const [gRows] = await db.query(
      "SELECT secret_key FROM payment_settings WHERE gateway='stripe' AND (admin_id IS NULL OR admin_id=0) LIMIT 1"
    );
    if (gRows[0]?.secret_key) return gRows[0].secret_key;
  } catch(_) {}

  return process.env.STRIPE_SECRET_KEY || null;
}

/** Get Stripe webhook secret for a site */
async function getStripeWebhookSecret(siteId) {
  const s = await getAdminPaymentSettings(siteId);
  if (s?.webhook_secret && s?.stripe_secret_key) return s.webhook_secret;
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

/** Get Paystack webhook secret for a site */
async function getPaystackWebhookSecret(siteId) {
  const s = await getAdminPaymentSettings(siteId);
  if (s?.webhook_secret && s?.paystack_secret_key) return s.webhook_secret;
  // Paystack uses secret key for HMAC verification
  return await getPaystackSecret(siteId);
}

async function getBankDetails(siteId) {
  const s = await getAdminPaymentSettings(siteId);
  if (s?.bank_account_number) return {
    bank_name: s.bank_name,
    bank_account_name: s.bank_account_name,
    bank_account_number: s.bank_account_number,
    bank_instructions: s.bank_instructions,
    currency: s.currency || "NGN",
  };
  // Fallback to old payment_settings table
  const [rows] = await db.query(
    "SELECT bank_name,bank_account_name,bank_account_number,bank_instructions FROM payment_settings WHERE gateway='bank_transfer' AND admin_id IS NULL LIMIT 1"
  );
  return rows[0] || null;
}

async function resolveSiteId(query) {
  if (query.school) return await getSiteIdFromSubdomain(query.school);
  if (query.site_id) return parseInt(query.site_id);
  return null;
}

/** Finalize a successful payment — marks order paid and grants access */
async function finalizePayment(order, paymentGateway) {
  if (!order || order.payment_status === "success") return;

  await db.query(
    "UPDATE orders SET payment_status='success', paid_at=NOW(), payment_gateway=? WHERE id=?",
    [paymentGateway, order.id]
  );

  // ── Subscription activation (via webhook) ──────────────────────────────────
  if (order.item_type === "subscription") {
    try {
      const [plans] = await db.query("SELECT * FROM subscription_plans WHERE id=? LIMIT 1", [order.item_id]);
      const plan = plans[0];
      if (plan) {
        const expiry = new Date();
        if (plan.interval === "year") expiry.setFullYear(expiry.getFullYear() + 1);
        else if (plan.interval === "quarter") expiry.setMonth(expiry.getMonth() + 3);
        else expiry.setMonth(expiry.getMonth() + 1);
        const expiryStr = expiry.toISOString().split("T")[0];
        const [existing] = await db.query(
          "SELECT id FROM admin_subscriptions WHERE admin_id=? ORDER BY id DESC LIMIT 1", [order.user_id]
        );
        if (existing[0]) {
          await db.query(
            "UPDATE admin_subscriptions SET plan=?,status='active',expires_at=?,payment_ref=?,updated_at=NOW() WHERE id=?",
            [plan.name, expiryStr, order.order_ref, existing[0].id]
          );
        } else {
          await db.query(
            "INSERT INTO admin_subscriptions (admin_id,plan,status,expires_at,payment_ref) VALUES (?,?,?,?,?)",
            [order.user_id, plan.name, "active", expiryStr, order.order_ref]
          );
        }
        await db.query(
          "INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
          [order.user_id, "🎉 Subscription Activated!",
           `Your ${plan.name} plan is active until ${new Date(expiryStr).toLocaleDateString("en-NG", {day:"numeric",month:"long",year:"numeric"})}.`,
           "success"]
        ).catch(() => {});
        try {
          const { clearPlanCache } = require("../middleware/subscriptionMiddleware");
          clearPlanCache(order.user_id);
        } catch (_) {}
      }
    } catch (subErr) {
      console.error("[finalizePayment] Subscription activation error:", subErr.message);
    }
    return; // Don't process commission or student emails for subscription payments
  }

  await db.query(
    "INSERT IGNORE INTO user_purchases (user_id,item_type,item_id,order_id) VALUES (?,?,?,?)",
    [order.user_id, order.item_type, order.item_id, order.id]
  );

  // ── Instructor Commission Split ───────────────────────────
  // When a course is sold, split revenue between admin and instructor
  try {
    if (order.item_type === "course" && order.amount > 0) {
      const [courseRows] = await db.query(
        "SELECT id, instructor_id, site_id FROM courses WHERE id=? LIMIT 1",
        [order.item_id]
      );
      const course = courseRows[0];
      if (course && course.instructor_id) {
        // Get commission rate from admin settings (perm_instructor_commission)
        // Falls back to 70% instructor / 30% admin if not configured
        let commissionRate = 70; // default: instructor gets 70%
        const siteId = order.site_id || course.site_id;
        if (siteId) {
          const adminId = await getAdminIdFromSiteId(siteId);
          if (adminId) {
            const [settingRows] = await db.query(
              "SELECT perm_instructor_commission FROM admin_permissions WHERE admin_id=? LIMIT 1",
              [adminId]
            );
            if (settingRows[0]?.perm_instructor_commission != null) {
              commissionRate = parseFloat(settingRows[0].perm_instructor_commission);
            }
          }
        }
        const instructorAmount = parseFloat(((commissionRate / 100) * order.amount).toFixed(2));
        const adminAmount = parseFloat((order.amount - instructorAmount).toFixed(2));

        // Ensure instructor wallet exists and credit it
        await db.query(
          "INSERT IGNORE INTO instructor_wallet (instructor_id, balance) VALUES (?, 0)",
          [course.instructor_id]
        );
        await db.query(
          "UPDATE instructor_wallet SET balance = balance + ?, total_earned = total_earned + ? WHERE instructor_id=?",
          [instructorAmount, instructorAmount, course.instructor_id]
        );
        // Record earnings entry
        await db.query(
          `INSERT INTO earnings (instructor_id, course_id, order_id, amount, commission_rate, admin_amount, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE amount=VALUES(amount)`,
          [course.instructor_id, course.id, order.id, instructorAmount, commissionRate, adminAmount]
        );
      }
    }
  } catch (commErr) {
    console.error("[paymentController] Commission split error:", commErr.message);
  }

  // ── Post-payment emails ──────────────────────────────────
  try {
    const [userRows] = await db.query("SELECT id,name,email,site_id FROM users WHERE id=? LIMIT 1", [order.user_id]);
    const user = userRows[0];
    if (!user) return;

    if (order.item_type === "course") {
      const [cRows] = await db.query("SELECT title,instructor_id FROM courses WHERE id=? LIMIT 1", [order.item_id]);
      if (cRows[0]) {
        // Email student
        emailService.sendCoursePurchase(user, cRows[0].title, order.site_id).catch(() => {});
        // In-app notification to student
        await db.query(
          "INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
          [user.id, "🎉 Enrollment Confirmed!", `You now have full access to "${cRows[0].title}". Go to your dashboard to start learning.`, "success"]
        ).catch(() => {});
        // Notify instructor of new enrollment
        if (cRows[0].instructor_id && cRows[0].instructor_id !== order.user_id) {
          const [instrRows] = await db.query("SELECT id,name,email,site_id FROM users WHERE id=? LIMIT 1", [cRows[0].instructor_id]);
          if (instrRows[0]) {
            emailService.sendNewEnrollment(instrRows[0], user.name, cRows[0].title, order.site_id).catch(() => {});
            await db.query(
              "INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
              [cRows[0].instructor_id, "👤 New Student Enrolled", `${user.name} just enrolled in your course "${cRows[0].title}".`, "info"]
            ).catch(() => {});
          }
        }
      }
    } else if (order.item_type === "past_question") {
      const [pRows] = await db.query("SELECT title FROM past_questions WHERE id=? LIMIT 1", [order.item_id]);
      if (pRows[0]) {
        emailService.sendPqPurchase(user, pRows[0].title, order.site_id).catch(() => {});
        await db.query(
          "INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
          [user.id, "✅ Access Granted!", `You now have full access to "${pRows[0].title}". Go to your dashboard to view it.`, "success"]
        ).catch(() => {});
      }
    }
  } catch (e) {
    console.error("[paymentController] Post-payment email error:", e.message);
  }
}

// ── Public endpoints ──────────────────────────────────────────

exports.getGateways = async (req, res) => {
  try {
    const siteId = await resolveSiteId(req.query);
    const adminId = siteId ? await getAdminIdFromSiteId(siteId) : null;
    let rows = [];

    if (adminId) {
      // Read per-admin keys from payment_settings (what the admin UI writes to)
      const [psRows] = await db.query(
        `SELECT gateway, display_name, public_key, secret_key, is_active,
                bank_name, bank_account_name, bank_account_number, bank_instructions
         FROM payment_settings WHERE admin_id=? ORDER BY gateway`,
        [adminId]
      );
      if (psRows.length) {
        rows = psRows;
      } else {
        // Fall back to admin_payment_settings (older table)
        const aps = await getAdminPaymentSettings(siteId, adminId);
        if (aps) {
          if (aps.paystack_public_key)    rows.push({ gateway:'paystack',      display_name:'Paystack',      public_key: aps.paystack_public_key,      is_active: 1 });
          if (aps.flutterwave_public_key) rows.push({ gateway:'flutterwave',   display_name:'Flutterwave',   public_key: aps.flutterwave_public_key,   is_active: 1 });
          if (aps.stripe_public_key)      rows.push({ gateway:'stripe',        display_name:'Stripe',        public_key: aps.stripe_public_key,        is_active: 1 });
          if (aps.bank_account_number)    rows.push({ gateway:'bank_transfer', display_name:'Bank Transfer', is_active: 1,
            bank_name: aps.bank_name, bank_account_name: aps.bank_account_name, bank_account_number: aps.bank_account_number });
        }
      }
    }

    // Final fallback: platform-level gateways (admin_id IS NULL)
    if (!rows.length) {
      [rows] = await db.query(
        `SELECT gateway, display_name, public_key, is_active, commission_percent,
                bank_name, bank_account_name, bank_account_number, bank_instructions
         FROM payment_settings WHERE admin_id IS NULL ORDER BY gateway`
      );
    }

    // Deduplicate by gateway name (last-write-wins)
    const seen = {};
    rows.forEach(r => { seen[r.gateway] = r; });
    const deduped = Object.values(seen);

    // Only return ACTIVE gateways — strictly check is_active === 1
    const active = deduped.filter(g => g.is_active == 1 || g.is_active === true);
    res.json(active);
  } catch(e) { res.status(500).json({ message: e.message }); }
};

exports.getTemplateGateways = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT gateway,display_name,public_key,is_active,bank_name,bank_account_name,bank_account_number FROM payment_settings WHERE admin_id IS NULL AND is_active=1"
    );
    if (rows.length) return res.json(rows);

    // No platform gateways configured in DB — fall back to .env keys
    const fallback = [];
    if (process.env.PAYSTACK_PUBLIC_KEY) {
      fallback.push({
        gateway: 'paystack', display_name: 'Paystack',
        public_key: process.env.PAYSTACK_PUBLIC_KEY, is_active: 1
      });
    }
    if (process.env.FLUTTERWAVE_PUBLIC_KEY) {
      fallback.push({
        gateway: 'flutterwave', display_name: 'Flutterwave',
        public_key: process.env.FLUTTERWAVE_PUBLIC_KEY, is_active: 1
      });
    }
    if (process.env.STRIPE_PUBLIC_KEY) {
      fallback.push({
        gateway: 'stripe', display_name: 'Stripe',
        public_key: process.env.STRIPE_PUBLIC_KEY, is_active: 1
      });
    }
    res.json(fallback);
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── PAYSTACK WEBHOOK (POST /payments/webhook/paystack) ────────
exports.webhookPaystack = async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];
    const rawBody = req.rawBody; // set by express.json verify callback in server.js
    if (!signature || !rawBody) return res.sendStatus(400);

    // Find the order by reference in the payload to get siteId for per-admin secret
    const event = req.body;
    const ref = event?.data?.reference;
    let siteId = null;
    if (ref) {
      const [orders] = await db.query("SELECT site_id FROM orders WHERE order_ref=? LIMIT 1", [ref]);
      siteId = orders[0]?.site_id || null;
    }

    const secret = await getPaystackSecret(siteId);
    if (!secret) return res.sendStatus(400);

    // Verify HMAC
    const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    if (hash !== signature) {
      console.warn("[webhook/paystack] Invalid signature for ref:", ref);
      return res.sendStatus(401);
    }

    if (event.event === "charge.success") {
      const [orders] = await db.query("SELECT * FROM orders WHERE order_ref=? LIMIT 1", [ref]);
      if (orders[0]) await finalizePayment(orders[0], "paystack");
    }

    res.sendStatus(200);
  } catch(e) {
    console.error("[webhook/paystack] Error:", e.message);
    res.sendStatus(500);
  }
};

// ── FLUTTERWAVE WEBHOOK (POST /payments/webhook/flutterwave) ──
exports.webhookFlutterwave = async (req, res) => {
  try {
    const signature = req.headers["verif-hash"];
    if (!signature) return res.sendStatus(400);

    // Find order to get siteId
    const ref = req.body?.data?.tx_ref || req.body?.txRef;
    let siteId = null;
    if (ref) {
      const [orders] = await db.query("SELECT site_id FROM orders WHERE order_ref=? LIMIT 1", [ref]);
      siteId = orders[0]?.site_id || null;
    }

    const aps = await getAdminPaymentSettings(siteId);
    const secretHash = aps?.flutterwave_secret_key || process.env.FLUTTERWAVE_SECRET_HASH || process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretHash) return res.sendStatus(400);

    // Flutterwave uses the secret hash directly as signature
    if (signature !== secretHash) {
      console.warn("[webhook/flutterwave] Invalid signature for ref:", ref);
      return res.sendStatus(401);
    }

    const status = req.body?.data?.status || req.body?.status;
    if (status === "successful" && ref) {
      const [orders] = await db.query("SELECT * FROM orders WHERE order_ref=? LIMIT 1", [ref]);
      if (orders[0]) await finalizePayment(orders[0], "flutterwave");
    }

    res.sendStatus(200);
  } catch(e) {
    console.error("[webhook/flutterwave] Error:", e.message);
    res.sendStatus(500);
  }
};

// ── STRIPE WEBHOOK (POST /payments/webhook/stripe) ────────────
exports.webhookStripe = async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"];
    const rawBody = req.rawBody;
    if (!signature || !rawBody) return res.sendStatus(400);

    // Parse the event manually (no stripe SDK, use raw body)
    const event = req.body;
    const ref = event?.data?.object?.metadata?.order_ref || event?.data?.object?.client_reference_id;

    let siteId = null;
    if (ref) {
      const [orders] = await db.query("SELECT site_id FROM orders WHERE order_ref=? LIMIT 1", [ref]);
      siteId = orders[0]?.site_id || null;
    }

    const webhookSecret = await getStripeWebhookSecret(siteId);
    if (!webhookSecret) return res.sendStatus(400);

    // Manually verify Stripe webhook signature
    const parts = signature.split(",");
    const ts = parts.find(p => p.startsWith("t="))?.split("=")[1];
    const v1 = parts.find(p => p.startsWith("v1="))?.split("=")[1];
    if (!ts || !v1) return res.sendStatus(400);

    const tolerance = 300; // 5 minutes
    if (Math.abs(Date.now() / 1000 - parseInt(ts)) > tolerance) {
      return res.status(400).json({ message: "Webhook timestamp too old" });
    }

    const signedPayload = `${ts}.${rawBody}`;
    const expectedSig = crypto.createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");
    if (expectedSig !== v1) {
      console.warn("[webhook/stripe] Invalid signature for ref:", ref);
      return res.sendStatus(401);
    }

    if ((event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") && ref) {
      const [orders] = await db.query("SELECT * FROM orders WHERE order_ref=? LIMIT 1", [ref]);
      if (orders[0]) await finalizePayment(orders[0], "stripe");
    }

    res.sendStatus(200);
  } catch(e) {
    console.error("[webhook/stripe] Error:", e.message);
    res.sendStatus(500);
  }
};

// ── Paystack redirect callback (GET) ──────────────────────────
exports.verifyPaystack = async (req, res) => {
  try {
    const ref = req.query.reference || req.query.trxref;
    const [orders] = await db.query("SELECT * FROM orders WHERE order_ref=?", [ref]);
    if (!orders[0]) return res.redirect("/payment-failed");
    // Server-side verify (not trusting redirect alone — webhook is primary)
    const secret = await getPaystackSecret(orders[0].site_id);
    const resp = await axios.get(
      `https://api.paystack.co/transaction/verify/${ref}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    if (resp.data.data.status === "success") {
      await finalizePayment(orders[0], "paystack");
    }
    res.redirect(`/payment-success?ref=${ref}`);
  } catch(e) { res.redirect("/payment-failed"); }
};

// ── verifyInline (school site inline) ────────────────────────
exports.verifyInline = async (req, res) => {
  try {
    const { reference, item_type, item_id, school } = req.body;
    if (!reference) return res.status(400).json({ message: "reference required" });
    const siteId = school ? await getSiteIdFromSubdomain(school) : null;
    const secret = await getPaystackSecret(siteId);
    if (!secret) return res.status(400).json({ message: "Paystack not configured for this site" });
    const resp = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    if (resp.data.data.status !== "success") {
      return res.status(400).json({ message: "Payment not successful on Paystack" });
    }
    const [orders] = await db.query("SELECT * FROM orders WHERE order_ref=?", [reference]);
    if (orders.length) {
      await finalizePayment(orders[0], "paystack");
    } else if (item_type && item_id) {
      const tableMap = { course: "courses", past_question: "past_questions" };
      const table = tableMap[item_type];
      if (!table) return res.status(400).json({ message: "Invalid item_type" });
      const [items] = await db.query(`SELECT id,price FROM ${table} WHERE id=?`, [item_id]);
      if (!items.length) return res.status(404).json({ message: "Item not found" });
      const [r] = await db.query(
        "INSERT INTO orders (user_id,site_id,order_ref,item_type,item_id,amount,payment_gateway,payment_status,paid_at) VALUES (?,?,?,?,?,?,'paystack','success',NOW())",
        [req.user.id, siteId, reference, item_type, item_id, items[0].price]
      );
      const fakeOrder = { id: r.insertId, user_id: req.user.id, site_id: siteId, item_type, item_id, payment_status: "pending" };
      await finalizePayment(fakeOrder, "paystack");
    } else {
      return res.status(400).json({ message: "item_type and item_id required for new order" });
    }
    res.json({ ok: true, message: "Payment verified and access granted" });
  } catch(e) { console.error("verifyInline:", e.message); res.status(500).json({ message: e.message }); }
};

// ── Bank proof ────────────────────────────────────────────────
exports.uploadBankProof = async (req, res) => {
  try {
    const { item_type, item_id, amount, school } = req.body;
    if (!req.file) return res.status(400).json({ message: "Payment proof required" });
    if (!item_type || !item_id) return res.status(400).json({ message: "item_type and item_id required" });
    const siteId = school ? await getSiteIdFromSubdomain(school) : null;
    const ref = "EP-" + uuidv4().slice(0,12).toUpperCase();
    const proof = "/uploads/bank_transfers/" + req.file.filename;
    const [r] = await db.query(
      "INSERT INTO orders (user_id,site_id,order_ref,item_type,item_id,amount,payment_gateway,payment_status,bank_transfer_proof) VALUES (?,?,?,?,?,?,'bank_transfer','awaiting_approval',?)",
      [req.user.id, siteId, ref, item_type, item_id, amount||0, proof]
    );
    if (siteId) {
      const adminId = await getAdminIdFromSiteId(siteId);
      if (adminId) {
        await db.query(
          "INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
          [adminId, "🏦 Bank Transfer Pending", `New ${item_type} payment proof submitted. Ref: ${ref}. Click to review.`, "warning"]
        );
        // Email admin
        try {
          const [adminRows] = await db.query("SELECT id,name,email FROM users WHERE id=? LIMIT 1", [adminId]);
          const tableMap = { course: "courses", past_question: "past_questions" };
          const tbl = tableMap[item_type];
          let itemTitle = item_type;
          if (tbl) {
            const [iRows] = await db.query(`SELECT title FROM ${tbl} WHERE id=? LIMIT 1`, [item_id]);
            if (iRows[0]) itemTitle = iRows[0].title;
          }
          const [userRows2] = await db.query("SELECT name FROM users WHERE id=? LIMIT 1", [req.user.id]);
          if (adminRows[0]) {
            emailService.sendBankTransferSubmitted(adminRows[0], userRows2[0]?.name || "A student", itemTitle, amount || 0, siteId).catch(() => {});
          }
        } catch (_) {}
      }
    }
    res.json({ ok: true, ref, message: "Proof uploaded. Awaiting admin approval (up to 24hrs)." });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── Free enrollment ───────────────────────────────────────────
exports.enrollFree = async (req, res) => {
  try {
    const { item_type, item_id } = req.body;
    if (!item_type || !item_id) return res.status(400).json({ message: "item_type and item_id required" });
    const [already] = await db.query(
      "SELECT id FROM user_purchases WHERE user_id=? AND item_type=? AND item_id=?",
      [req.user.id, item_type, item_id]
    );
    if (already.length) return res.json({ ok: true, message: "Already enrolled" });
    const tableMap = { course: "courses", past_question: "past_questions" };
    const table = tableMap[item_type];
    if (!table) return res.status(400).json({ message: "Invalid item_type" });
    const [items] = await db.query(`SELECT id,price,title FROM ${table} WHERE id=?`, [item_id]);
    if (!items.length) return res.status(404).json({ message: "Item not found" });
    if (Number(items[0].price) > 0) return res.status(400).json({ message: "This item is not free" });
    const ref = "FREE-" + uuidv4().slice(0,10).toUpperCase();
    const [r] = await db.query(
      "INSERT INTO orders (user_id,order_ref,item_type,item_id,amount,payment_gateway,payment_status,paid_at) VALUES (?,?,?,?,0,'free','success',NOW())",
      [req.user.id, ref, item_type, item_id]
    );
    await db.query(
      "INSERT IGNORE INTO user_purchases (user_id,item_type,item_id,order_id) VALUES (?,?,?,?)",
      [req.user.id, item_type, item_id, r.insertId]
    );
    // Send enrollment email
    const [uRow] = await db.query("SELECT id,name,email,site_id FROM users WHERE id=? LIMIT 1", [req.user.id]);
    if (uRow[0] && item_type === "course") {
      emailService.sendCourseEnrolled(uRow[0], items[0].title, uRow[0].site_id).catch(() => {});
    }
    res.json({ ok: true, message: "Enrolled successfully!" });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── Initiate payment ──────────────────────────────────────────
exports.initiate = async (req, res) => {
  try {
    const { item_type, item_id, gateway, site_id } = req.body;
    if (!item_type || !item_id) return res.status(400).json({ message: "item_type and item_id required" });

    const tableMap = { course: "courses", past_question: "past_questions", template: "page_templates" };
    const table = tableMap[item_type];
    if (!table) return res.status(400).json({ message: "Invalid item type" });

    const [items] = await db.query(`SELECT id,title,price FROM ${table} WHERE id=?`, [item_id]);
    if (!items.length) return res.status(404).json({ message: "Item not found" });
    const item = items[0];

    const [already] = await db.query(
      "SELECT id FROM user_purchases WHERE user_id=? AND item_type=? AND item_id=?",
      [req.user.id, item_type, item_id]
    );
    if (already.length) return res.status(400).json({ message: "You already own this" });

    const ref = "EP-" + uuidv4().slice(0,12).toUpperCase();
    const usedSiteId = site_id || null;
    const gw = gateway || "bank_transfer";

    await db.query(
      "INSERT INTO orders (user_id,site_id,order_ref,item_type,item_id,amount,payment_gateway,payment_status) VALUES (?,?,?,?,?,?,?,?)",
      [req.user.id, usedSiteId, ref, item_type, item_id, item.price, gw, "pending"]
    );

    // ── Bank Transfer ──────────────────────────────────────
    if (gw === "bank_transfer") {
      await db.query("UPDATE orders SET payment_status='awaiting_approval' WHERE order_ref=?", [ref]);
      const bank = await getBankDetails(usedSiteId);
      return res.json({ ok: true, order_ref: ref, bank_transfer: true, bank_details: bank || { instructions: "Contact admin for bank details" } });
    }

    // ── Paystack ───────────────────────────────────────────
    if (gw === "paystack") {
      const secret = await getPaystackSecret(usedSiteId);
      if (!secret) return res.status(400).json({ message: "Paystack not configured for this site" });
      const resp = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: req.user.email,
          amount: Math.round(item.price * 100),
          reference: ref,
          callback_url: `${process.env.APP_URL}/api/payments/verify/paystack`,
          metadata: { order_ref: ref, user_id: req.user.id },
        },
        { headers: { Authorization: `Bearer ${secret}` } }
      );
      return res.json({ ok: true, order_ref: ref, authorization_url: resp.data.data.authorization_url });
    }

    // ── Flutterwave ────────────────────────────────────────
    if (gw === "flutterwave") {
      const secret = await getFlutterwaveSecret(usedSiteId);
      if (!secret) return res.status(400).json({ message: "Flutterwave not configured for this site" });
      const aps = await getAdminPaymentSettings(usedSiteId);
      const currency = aps?.currency || "NGN";
      const resp = await axios.post(
        "https://api.flutterwave.com/v3/payments",
        {
          tx_ref: ref,
          amount: item.price,
          currency,
          redirect_url: `${process.env.APP_URL}/api/payments/verify/flutterwave?ref=${ref}`,
          customer: { email: req.user.email, name: req.user.name },
          customizations: { title: `Payment for ${item.title}` },
          meta: { order_ref: ref },
        },
        { headers: { Authorization: `Bearer ${secret}` } }
      );
      return res.json({ ok: true, order_ref: ref, authorization_url: resp.data.data.link });
    }

    // ── Stripe ─────────────────────────────────────────────
    if (gw === "stripe") {
      const secret = await getStripeSecret(usedSiteId);
      if (!secret) return res.status(400).json({ message: "Stripe not configured for this site" });
      const aps = await getAdminPaymentSettings(usedSiteId);
      const currency = (aps?.currency || "NGN").toLowerCase();
      const resp = await axios.post(
        "https://api.stripe.com/v1/checkout/sessions",
        new URLSearchParams({
          "payment_method_types[0]": "card",
          "line_items[0][price_data][currency]": currency,
          "line_items[0][price_data][product_data][name]": item.title,
          "line_items[0][price_data][unit_amount]": Math.round(item.price * 100),
          "line_items[0][quantity]": "1",
          "mode": "payment",
          "success_url": `${process.env.APP_URL}/payment-success?ref=${ref}`,
          "cancel_url": `${process.env.APP_URL}/payment-failed`,
          "client_reference_id": ref,
          "metadata[order_ref]": ref,
        }),
        {
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      return res.json({ ok: true, order_ref: ref, authorization_url: resp.data.url });
    }

    res.status(400).json({ message: `Gateway '${gw}' is not supported` });
  } catch(e) {
    console.error("Payment initiate:", e.response?.data || e.message);
    res.status(500).json({ message: e.response?.data?.message || e.message });
  }
};

// ── Flutterwave redirect callback (GET) ───────────────────────
exports.verifyFlutterwave = async (req, res) => {
  try {
    const ref = req.query.ref || req.query.tx_ref;
    const transactionId = req.query.transaction_id;
    if (!ref) return res.redirect("/payment-failed");

    const [orders] = await db.query("SELECT * FROM orders WHERE order_ref=? LIMIT 1", [ref]);
    if (!orders[0]) return res.redirect("/payment-failed");

    const secret = await getFlutterwaveSecret(orders[0].site_id);
    if (!secret || !transactionId) return res.redirect("/payment-failed");

    const resp = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    if (resp.data.data.status === "successful" && resp.data.data.tx_ref === ref) {
      await finalizePayment(orders[0], "flutterwave");
    }
    res.redirect(`/payment-success?ref=${ref}`);
  } catch(e) { res.redirect("/payment-failed"); }
};

// ── Template bank proof (no auth) ─────────────────────────────
exports.uploadTemplateBankProof = async (req, res) => {
  try {
    const { template_id, amount } = req.body;
    if (!req.file) return res.status(400).json({ message: "Payment proof image required" });
    if (!template_id) return res.status(400).json({ message: "template_id required" });
    const proof = "/uploads/bank_transfers/" + req.file.filename;
    const ref = "TPL-" + uuidv4().slice(0,12).toUpperCase();
    await db.query(
      "INSERT INTO template_purchase_proofs (template_id,amount,proof_image,ref,status,created_at) VALUES (?,?,?,?,'pending',NOW())",
      [template_id, amount||0, proof, ref]
    );
    const [superAdmins] = await db.query("SELECT id FROM users WHERE role_id=4 LIMIT 1");
    if (superAdmins[0]) {
      await db.query(
        "INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
        [superAdmins[0].id, "🏦 Template Purchase Proof", `Bank transfer proof for template #${template_id}. Ref: ${ref}`, "warning"]
      );
    }
    res.json({ ok: true, ref, message: "Proof uploaded successfully." });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── Legacy uploadProof ────────────────────────────────────────
exports.uploadProof = async (req, res) => {
  try {
    const { order_ref } = req.body;
    if (!order_ref || !req.file) return res.status(400).json({ message: "order_ref and proof image required" });
    const [orders] = await db.query("SELECT * FROM orders WHERE order_ref=? AND user_id=?", [order_ref, req.user.id]);
    if (!orders.length) return res.status(404).json({ message: "Order not found" });
    const proof = "/uploads/bank_transfers/" + req.file.filename;
    await db.query("UPDATE orders SET bank_transfer_proof=?,payment_status='awaiting_approval' WHERE order_ref=?", [proof, order_ref]);
    if (orders[0].site_id) {
      const [admin] = await db.query("SELECT user_id FROM admin_sites WHERE id=?", [orders[0].site_id]);
      if (admin[0]) await db.query(
        "INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
        [admin[0].user_id, "🏦 Bank Transfer Pending", `Order ${order_ref} awaiting your approval`, "warning"]
      );
    }
    res.json({ ok: true, message: "Proof uploaded. Awaiting admin approval." });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

exports.getMyOrders = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC", [req.user.id]);
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// Export internal helper for use in routes
exports._finalizePayment = finalizePayment;