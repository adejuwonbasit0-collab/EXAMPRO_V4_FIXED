// ===================================
// ExamPro - Global JS Utilities
// ===================================

const API = window.location.origin + '/api';

// ---- AUTH HELPERS ----
const Auth = {
  getToken: () => localStorage.getItem('ep_token'),
  // FIX: always use 'ep_user' key — was inconsistently 'user' in some places
  getUser:  () => { try { return JSON.parse(localStorage.getItem('ep_user') || 'null'); } catch(_){ return null; } },
  isLoggedIn: () => !!localStorage.getItem('ep_token'),
  isSuperAdmin: () => Auth.getUser()?.role_id === 4,
  isAdmin: () => [2, 4].includes(Auth.getUser()?.role_id),
  isInstructor: () => Auth.getUser()?.role_id === 3,
  isAdminOrInstructor: () => [2, 3, 4].includes(Auth.getUser()?.role_id),
  getDashboardUrl: () => {
    const u = Auth.getUser();
    if (!u) return '/login';
    if (u.role_id === 4) return '/super-admin';
    if (u.role_id === 2) return '/admin';
    if (u.role_id === 3) return '/instructor';
    return '/dashboard';
  },
  // FIX: logout now correctly reads ep_user (not 'user'), clears both keys,
  // and redirects school users back to their school login page
  logout: function() {
    var user = Auth.getUser();
    var siteId = user ? user.site_id : null;
    var schoolCtx = sessionStorage.getItem('school_context');

    // Clear all auth state
    localStorage.removeItem('ep_token');
    localStorage.removeItem('ep_user');
    localStorage.removeItem('user'); // clear legacy key too
    sessionStorage.removeItem('school_context');

    // School users (students/instructors) → back to school login
    if (siteId) {
      fetch('/api/institutions/public/site-by-id/' + siteId)
        .then(function(r) { return r.json(); })
        .then(function(site) {
          if (site && site.subdomain) {
            window.location.href = '/login?school=' + site.subdomain;
          } else {
            window.location.href = '/login';
          }
        })
        .catch(function() { window.location.href = '/login'; });
      return;
    }

    // If school context was in session (e.g. admin who owns a school)
    if (schoolCtx) {
      window.location.href = '/login?school=' + schoolCtx;
      return;
    }

    window.location.href = '/login';
  },
  // Save user to localStorage with consistent key
  saveUser: function(userData) {
    try {
      localStorage.setItem('ep_user', JSON.stringify(userData));
      // Remove legacy key to avoid confusion
      localStorage.removeItem('user');
    } catch(_) {}
  },
  // Persist and retrieve school context across pages
  setSchoolContext: function(school) {
    if (school) {
      sessionStorage.setItem('school_context', school);
    } else {
      sessionStorage.removeItem('school_context');
    }
  },
  getSchoolContext: function() {
    return sessionStorage.getItem('school_context') || null;
  },
  headers: () => ({
    'Content-Type': 'application/json',
    ...(Auth.getToken() ? { Authorization: 'Bearer ' + Auth.getToken() } : {})
  })
};

// ---- HTTP HELPER ----
const http = {
  get: async (url) => {
    try {
      const res = await fetch(API + url, { headers: Auth.headers() });
      const data = await res.json();
      if (res.status === 401 && Auth.isLoggedIn()) { Auth.logout(); return null; }
      if (res.status === 402 && data.subscription_expired) {
        if (!window.location.pathname.startsWith('/admin/subscribe')) {
          window.location.href = '/admin/subscribe';
        }
        return null;
      }
      return data;
    } catch(e) { console.error('GET', url, e.message); return null; }
  },
  post: async (url, body, isFormData) => {
    try {
      const headers = isFormData ? { Authorization: 'Bearer ' + Auth.getToken() } : Auth.headers();
      const res = await fetch(API + url, {
        method: 'POST', headers,
        body: isFormData ? body : JSON.stringify(body)
      });
      const data = await res.json();
      if (res.status === 401 && url.indexOf('/auth/') === -1) { Auth.logout(); return null; }
      if (res.status === 402 && data.subscription_expired) {
        if (!window.location.pathname.startsWith('/admin/subscribe')) {
          window.location.href = '/admin/subscribe';
        }
        return null;
      }
      return Object.assign({}, data, { ok: res.ok, status: res.status });
    } catch(e) { console.error('POST', url, e.message); return null; }
  },
  put: async (url, body) => {
    try {
      const res = await fetch(API + url, { method: 'PUT', headers: Auth.headers(), body: JSON.stringify(body) });
      const data = await res.json();
      if (res.status === 402 && data.subscription_expired) {
        if (!window.location.pathname.startsWith('/admin/subscribe')) window.location.href = '/admin/subscribe';
        return null;
      }
      return Object.assign({}, data, { ok: res.ok });
    } catch(e) { return null; }
  },
  patch: async (url, body) => {
    try {
      const res = await fetch(API + url, { method: 'PATCH', headers: Auth.headers(), body: JSON.stringify(body || {}) });
      const data = await res.json();
      if (res.status === 402 && data.subscription_expired) {
        if (!window.location.pathname.startsWith('/admin/subscribe')) window.location.href = '/admin/subscribe';
        return null;
      }
      return Object.assign({}, data, { ok: res.ok });
    } catch(e) { return null; }
  },
  delete: async (url) => {
    try {
      const res = await fetch(API + url, { method: 'DELETE', headers: Auth.headers() });
      return Object.assign({}, await res.json(), { ok: res.ok });
    } catch(e) { return null; }
  }
};

// ---- TOAST NOTIFICATIONS ----
const Toast = {
  container: null,
  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(this.container);
  },
  show(message, type, duration) {
    if (!this.container) this.init();
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const colors = { success: '#10b981', error: '#ef4444', info: '#5b7dff', warning: '#f59e0b' };
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    toast.style.cssText = 'background:var(--bg-card,#1e2535);border:1px solid ' + (colors[type] || colors.info) + ';border-radius:10px;padding:12px 18px;box-shadow:0 8px 30px rgba(0,0,0,.3);font-size:.875rem;display:flex;align-items:center;gap:10px;max-width:320px;animation:slideUp .3s ease;';
    toast.innerHTML = '<span style="flex-shrink:0">' + (icons[type] || '💬') + '</span><span>' + message + '</span>';
    this.container.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all .3s';
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
    }, duration || 4000);
  },
  success: function(msg) { Toast.show(msg, 'success'); },
  error:   function(msg) { Toast.show(msg, 'error'); },
  info:    function(msg) { Toast.show(msg, 'info'); },
  warning: function(msg) { Toast.show(msg, 'warning'); }
};

// ---- FORMAT HELPERS ----
const fmt = {
  currency: (amount, currency) => {
    const symbol = (currency || 'NGN') === 'NGN' ? '₦' : '$';
    return symbol + Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  },
  date: (d) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }),
  datetime: (d) => new Date(d).toLocaleString('en-NG'),
  timeAgo: (d) => {
    const diff = Date.now() - new Date(d);
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
    return Math.floor(diff/86400000) + 'd ago';
  },
  statusBadge: (status) => {
    const map = { success: 'badge-success', pending: 'badge-warning', failed: 'badge-danger', refunded: 'badge-primary' };
    return '<span class="badge ' + (map[status] || 'badge-primary') + '">' + status + '</span>';
  }
};

// ---- NAVBAR SCROLL ----
window.addEventListener('scroll', function() {
  const nav = document.querySelector('.navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
});

// ---- PROTECT ROUTES ----
// FIX: school students/instructors should go to /dashboard or /instructor, not /login
const protectRoute = (adminOrInstructor) => {
  if (!Auth.isLoggedIn()) {
    const school = sessionStorage.getItem('school_context');
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = school
      ? '/login?school=' + school + '&redirect=' + redirect
      : '/login?redirect=' + redirect;
    return false;
  }
  if (adminOrInstructor && !Auth.isAdmin() && !Auth.isInstructor()) {
    window.location.href = '/dashboard';
    return false;
  }
  return true;
};

// ---- REDIRECT IF LOGGED IN ----
const redirectIfLoggedIn = () => {
  if (!Auth.isLoggedIn()) return;
  const schoolParam = new URLSearchParams(window.location.search).get('school');
  if (schoolParam) return; // stay on login page so school context is preserved
  const user = Auth.getUser();
  if (!user) return;
  window.location.href = Auth.getDashboardUrl();
};

// ---- MODAL HELPER ----
const Modal = {
  open: (id) => { const el = document.getElementById(id); if(el) el.classList.add('open'); },
  close: (id) => { const el = document.getElementById(id); if(el) el.classList.remove('open'); },
  closeAll: () => document.querySelectorAll('.modal-overlay').forEach(function(m) { m.classList.remove('open'); })
};
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
  if (e.target.classList.contains('modal-close')) {
    const overlay = e.target.closest('.modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }
});

// ---- LOADING ----
const setLoading = (btn, loading) => {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.style.minWidth = btn.offsetWidth + 'px';
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span><span style="vertical-align:middle;">Loading...</span>';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.style.minWidth = '';
    btn.disabled = false;
  }
};

// ---- DEBOUNCE ----
const debounce = (fn, delay) => {
  let t;
  return function() { const args = arguments; clearTimeout(t); t = setTimeout(function() { fn.apply(null, args); }, delay); };
};

// ---- PAYMENT GATEWAYS LOADER ----
async function loadGateways(containerId, siteId) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  cont.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted)">Loading payment methods...</div>';
  const resolvedSiteId = siteId || Auth.getUser()?.site_id || null;
  const url = resolvedSiteId ? '/payments/gateways?site_id=' + resolvedSiteId : '/payments/gateways';
  const gws = await http.get(url) || [];
  if (!gws.length) {
    cont.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:20px;">No payment methods available at this time.</div>';
    return;
  }
  cont.innerHTML = gws.map(function(g) {
    return '<button class="gw-btn" data-gw="' + g.gateway + '" onclick="pickGw(\'' + g.gateway + '\')" style="padding:14px;border-radius:10px;border:2px solid var(--border);background:var(--bg-card2);cursor:pointer;color:var(--text);font-size:0.88rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s;">' + g.display_name + '</button>';
  }).join('');
}

// ---- THEME TOGGLE ----
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ep_theme', theme);
  const knob = document.getElementById('themeToggleKnob');
  if (knob) {
    knob.style.transform = theme === 'dark' ? 'translateX(18px)' : 'translateX(0)';
  }
}
function initThemeToggle() {
  const saved = localStorage.getItem('ep_theme') || 'light';
  setTheme(saved);
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.checked = saved === 'dark';
    toggle.addEventListener('change', function() { setTheme(toggle.checked ? 'dark' : 'light'); });
  }
}
window.addEventListener('DOMContentLoaded', initThemeToggle);

// ---- INIT TOAST ----
document.addEventListener('DOMContentLoaded', function() { Toast.init(); });

// ---- REQUIRE LOGIN ----
const requireLogin = () => {
  if (!Auth.isLoggedIn()) {
    const school = sessionStorage.getItem('school_context');
    const redirect = '/login?redirect=' + encodeURIComponent(window.location.pathname);
    window.location.href = school ? redirect + '&school=' + school : redirect;
    return false;
  }
  return true;
};

// ---- STATUS BADGE ----
function statusBadge(status) {
  const map = {
    success:  { cls: 'badge-accent',   label: '✓ Success'   },
    paid:     { cls: 'badge-accent',   label: '✓ Paid'      },
    pending:  { cls: 'badge-warning',  label: '⏳ Pending'   },
    failed:   { cls: 'badge-danger',   label: '✗ Failed'    },
    refunded: { cls: 'badge-primary',  label: '↩ Refunded'  },
    approved: { cls: 'badge-accent',   label: '✓ Approved'  },
    rejected: { cls: 'badge-danger',   label: '✗ Rejected'  },
  };
  const s = (status || 'pending').toLowerCase();
  const { cls, label } = map[s] || { cls: 'badge-primary', label: status };
  return '<span class="badge ' + cls + '">' + label + '</span>';
}

// ---- ALIASES ----
Auth.loggedIn = () => Auth.isLoggedIn();
Auth.go = () => { window.location.href = Auth.getDashboardUrl(); };