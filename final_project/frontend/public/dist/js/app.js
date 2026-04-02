// ===================================
// ExamPro - Global JS Utilities
// ===================================

const API = window.location.origin + '/api';

// ---- AUTH HELPERS ----
const Auth = {
  getToken: () => localStorage.getItem('ep_token'),
  getUser:  () => JSON.parse(localStorage.getItem('ep_user') || 'null'),
  isLoggedIn: () => !!localStorage.getItem('ep_token'),
  isSuperAdmin: () => Auth.getUser()?.role_id === 4,
  isAdmin: () => [2, 4].includes(Auth.getUser()?.role_id),
  isInstructor: () => Auth.getUser()?.role_id === 3,
  isAdminOrInstructor: () => [2, 3, 4].includes(Auth.getUser()?.role_id),

  // Get school context: check URL param → sessionStorage → user's site_id
  getSchoolContext: () => {
    const urlParam = new URLSearchParams(window.location.search).get('school');
    if (urlParam) return urlParam;
    return sessionStorage.getItem('school_context') || null;
  },

  // Persist school context (called after login, registration, OTP verify)
  setSchoolContext: (subdomain) => {
    if (subdomain) {
      sessionStorage.setItem('school_context', subdomain);
      localStorage.setItem('ep_school', subdomain);
    }
  },

  // Clear school context on logout
  clearSchoolContext: () => {
    sessionStorage.removeItem('school_context');
    // Keep ep_school for redirect — cleared after use
  },

  getDashboardUrl: () => {
    const u = Auth.getUser();
    if (!u) return '/login';
    if (u.role_id === 4) return '/super-admin';
    if (u.role_id === 2) return '/admin';
    if (u.role_id === 3) return '/instructor';
    return '/dashboard';
  },

  logout: (force) => {
    const user = JSON.parse(localStorage.getItem('ep_user') || 'null');
    const siteId = user ? user.site_id : null;
    const savedSchool = localStorage.getItem('ep_school') || sessionStorage.getItem('school_context');

    localStorage.removeItem('ep_token');
    localStorage.removeItem('ep_user');
    localStorage.removeItem('ep_school');
    sessionStorage.removeItem('school_context');

    // If user belongs to a school site, redirect back to that school's login
    if (siteId || savedSchool) {
      if (savedSchool) {
        window.location.href = '/login?school=' + savedSchool;
        return;
      }
      // Fetch subdomain from API if we only have siteId
      fetch('/api/institutions/public/site-by-id/' + siteId)
        .then(function(r){ return r.json(); })
        .then(function(site){
          window.location.href = (site && site.subdomain)
            ? '/login?school=' + site.subdomain
            : '/login';
        })
        .catch(function(){ window.location.href = '/login'; });
      return;
    }
    window.location.href = '/login';
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
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },
  show(message, type, duration) {
    if (!this.container) this.init();
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    toast.innerHTML = '<span>' + (icons[type] || 'ℹ️') + '</span><span>' + message + '</span>';
    this.container.appendChild(toast);
    setTimeout(function(){ toast.style.opacity = '0'; setTimeout(function(){ toast.remove(); }, 300); }, duration || 4000);
  },
  success: function(msg){ Toast.show(msg, 'success'); },
  error: function(msg){ Toast.show(msg, 'error'); },
  info: function(msg){ Toast.show(msg, 'info'); }
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
window.addEventListener('scroll', function(){
  const nav = document.querySelector('.navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
});

// ---- PROTECT ROUTES ----
const protectRoute = (adminOrInstructor) => {
  if (!Auth.isLoggedIn()) {
    const school = Auth.getSchoolContext();
    const loginUrl = '/login?redirect=' + encodeURIComponent(window.location.pathname) +
      (school ? '&school=' + school : '');
    window.location.href = loginUrl;
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
  if (schoolParam) return;
  const user = Auth.getUser();
  window.location.href = user.role_id === 4 ? '/super-admin' :
                         user.role_id === 2 ? '/admin' :
                         user.role_id === 3 ? '/instructor' : '/dashboard';
};

// ---- MODAL HELPER ----
const Modal = {
  open: (id) => { const el = document.getElementById(id); if(el) el.classList.add('open'); },
  close: (id) => { const el = document.getElementById(id); if(el) el.classList.remove('open'); },
  closeAll: () => document.querySelectorAll('.modal-overlay').forEach(function(m){ m.classList.remove('open'); })
};
document.addEventListener('click', function(e){
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
  return function(){ const args = arguments; clearTimeout(t); t = setTimeout(function(){ fn.apply(null, args); }, delay); };
};

// ---- PAYMENT GATEWAYS LOADER ----
async function loadGateways(containerId, siteId) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  cont.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted)">Loading...</div>';
  const resolvedSiteId = siteId || Auth.getUser()?.site_id || null;
  const url = resolvedSiteId ? '/payments/gateways?site_id=' + resolvedSiteId : '/payments/gateways';
  const gws = await http.get(url) || [];
  if (!gws.length) {
    cont.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted)">No payment methods available</div>';
    return;
  }
  cont.innerHTML = gws.map(function(g){
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
    knob.parentElement.parentElement.parentElement.style.background = theme === 'dark' ? 'rgba(91,125,255,0.3)' : 'var(--border)';
  }
}
function initThemeToggle() {
  const saved = localStorage.getItem('ep_theme') || 'light';
  setTheme(saved);
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.checked = saved === 'dark';
    toggle.addEventListener('change', function(){ setTheme(toggle.checked ? 'dark' : 'light'); });
  }
}
window.addEventListener('DOMContentLoaded', initThemeToggle);

// ---- INIT TOAST ----
Toast.init();

// ---- REQUIRE LOGIN ----
const requireLogin = () => {
  if (!Auth.isLoggedIn()) {
    const school = Auth.getSchoolContext();
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname) +
      (school ? '&school=' + school : '');
    return false;
  }
  return true;
};

// ---- STATUS BADGE ----
function statusBadge(status) {
  const map = {
    success:  { cls: 'badge-accent',   label: '✓ Success'  },
    paid:     { cls: 'badge-accent',   label: '✓ Paid'     },
    pending:  { cls: 'badge-warning',  label: '⏳ Pending'  },
    failed:   { cls: 'badge-danger',   label: '✗ Failed'   },
    refunded: { cls: 'badge-primary',  label: '↩ Refunded' },
    approved: { cls: 'badge-accent',   label: '✓ Approved' },
    rejected: { cls: 'badge-danger',   label: '✗ Rejected' },
  };
  const s = (status || 'pending').toLowerCase();
  const { cls, label } = map[s] || { cls: 'badge-primary', label: status };
  return '<span class="badge ' + cls + '">' + label + '</span>';
}

// ---- ALIASES ----
Auth.loggedIn = () => Auth.isLoggedIn();
Auth.go = () => { window.location.href = Auth.getDashboardUrl(); };