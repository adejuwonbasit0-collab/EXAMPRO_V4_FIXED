// backend/middleware/subscriptionMiddleware.js
// Enforces subscription status and plan limits for admin users (role_id=2)
// Super-admins (role_id=4) are never blocked

const db = require('../config/database');
const planCache = new Map();

async function getAdminPlan(adminId) {
  const cached = planCache.get(adminId);
  if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return cached.data;

  const [subs] = await db.query(
    `SELECT s.*, p.max_students, p.max_courses,
            COALESCE(p.max_past_questions, 0) as max_past_questions,
            COALESCE(p.page_builder_enabled, 1) as page_builder_enabled,
            COALESCE(p.ai_enabled, 1) as ai_enabled
     FROM admin_subscriptions s
     LEFT JOIN subscription_plans p ON LOWER(p.name)=LOWER(s.plan)
     WHERE s.admin_id=? ORDER BY s.id DESC LIMIT 1`,
    [adminId]
  ).catch(() => [[]]);

  const sub = subs[0] || null;
  const limits = {
    max_students: sub?.max_students || 0,
    max_courses: sub?.max_courses || 0,
    max_past_questions: sub?.max_past_questions || 0,
    page_builder_enabled: sub?.page_builder_enabled !== 0,
    ai_enabled: sub?.ai_enabled !== 0
  };

  const data = { sub, limits };
  planCache.set(adminId, { data, ts: Date.now() });
  return data;
}

function clearPlanCache(adminId) { planCache.delete(adminId); }

const subscriptionMiddleware = async (req, res, next) => {
  try {
    if (!req.user || req.user.role_id !== 2) return next();
    const adminId = req.user.id;
    const { sub, limits } = await getAdminPlan(adminId);

    // No subscription — 7-day free trial
    if (!sub) {
      const [u] = await db.query('SELECT created_at FROM users WHERE id=?', [adminId]).catch(() => [[]]);
      if (u[0]) {
        const days = (Date.now() - new Date(u[0].created_at)) / 86400000;
        if (days > 7) {
          return res.status(402).json({
            message: 'Your 7-day free trial has ended. Please subscribe to continue.',
            subscription_expired: true, redirect: '/admin-subscribe'
          });
        }
      }
      return next();
    }

    // Cancelled
    if (sub.status === 'cancelled') {
      return res.status(402).json({
        message: 'Your subscription was cancelled. Subscribe to continue.',
        subscription_expired: true, redirect: '/admin-subscribe'
      });
    }

    // Expired
    if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
      db.query("UPDATE admin_subscriptions SET status='expired' WHERE admin_id=? AND status='active'", [adminId]).catch(() => {});
      clearPlanCache(adminId);
      return res.status(402).json({
        message: 'Your subscription has expired. Please renew.',
        subscription_expired: true, expires_at: sub.expires_at, redirect: '/admin-subscribe'
      });
    }

    const method = req.method;
    const path = req.path || '';
    const baseUrl = req.baseUrl || '';

    // Max courses limit
    if (method === 'POST' && path === '/' && baseUrl.includes('/courses') && limits.max_courses > 0) {
      const [cnt] = await db.query('SELECT COUNT(*) as c FROM courses WHERE instructor_id=? AND is_active=1', [adminId]).catch(() => [[{ c: 0 }]]);
      if ((cnt[0]?.c || 0) >= limits.max_courses) {
        return res.status(403).json({
          message: `Your plan allows up to ${limits.max_courses} courses. Upgrade to create more.`,
          plan_limit_reached: true, limit_type: 'courses', current: cnt[0]?.c, max: limits.max_courses
        });
      }
    }

    // Max past questions limit
    if (method === 'POST' && path === '/' && baseUrl.includes('/past-questions') && limits.max_past_questions > 0) {
      const [cnt] = await db.query('SELECT COUNT(*) as c FROM past_questions WHERE created_by=? AND is_active=1', [adminId]).catch(() => [[{ c: 0 }]]);
      if ((cnt[0]?.c || 0) >= limits.max_past_questions) {
        return res.status(403).json({
          message: `Your plan allows up to ${limits.max_past_questions} past questions. Upgrade to add more.`,
          plan_limit_reached: true, limit_type: 'past_questions', current: cnt[0]?.c, max: limits.max_past_questions
        });
      }
    }

    // Page builder lock
    if ((path.includes('/page-builder') || path.includes('/pages')) && method !== 'GET' && limits.page_builder_enabled === false) {
      return res.status(403).json({
        message: 'Page Builder is not available on your current plan. Upgrade to access it.',
        plan_limit_reached: true, limit_type: 'page_builder'
      });
    }

    // AI lock
    if (baseUrl.includes('/ai') && limits.ai_enabled === false) {
      return res.status(403).json({
        message: 'AI Assistant is not available on your current plan.',
        plan_limit_reached: true, limit_type: 'ai'
      });
    }

    next();
  } catch (e) {
    console.error('[subscriptionMiddleware]', e.message);
    next(); // never block on our own error
  }
};

module.exports = subscriptionMiddleware;
module.exports.clearPlanCache = clearPlanCache;
