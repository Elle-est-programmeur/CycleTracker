/* ═══════════════════════════════════════════════════════════════
   CYCLE TRACKER — script.js
   Sections:
     1. Config & State
     2. Phase Data
     3. Three.js Background
     4. API Service
     5. Auth Management
     6. UI Utilities
     7. Dashboard
     8. Calendar
     9. Event Handlers
    10. Initialization
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ───────────────────────────────────────────────────────────────
   1. CONFIG & STATE
─────────────────────────────────────────────────────────────── */
const API = 'https://cycletracker-production.up.railway.app/api';

const state = {
  token:      null,
  user:       null,   // { name, email }
  prediction: null,   // latest CycleResponse
  cycles:     [],     // all saved Cycle[]
  calDate:    new Date(),
  offlineMode: false,
};

/* ───────────────────────────────────────────────────────────────
   2. PHASE DATA
─────────────────────────────────────────────────────────────── */
const PHASE = {
  Menstrual: {
    color: '#FF4B6E',
    bg:    'rgba(255,75,110,0.12)',
    label: 'Menstrual',
    icon:  '🌑',
    ring:  '#FF4B6E',
    grad:  ['#FF4B6E', '#FF9EB5'],
  },
  Follicular: {
    color: '#FF6B91',
    bg:    'rgba(255,107,145,0.12)',
    label: 'Follicular',
    icon:  '🌒',
    ring:  null, // uses default gradient
    grad:  ['#FF6B91', '#C77DFF'],
  },
  Ovulation: {
    color: '#E09500',
    bg:    'rgba(255,187,56,0.15)',
    label: 'Ovulation',
    icon:  '🌕',
    ring:  '#FFBB38',
    grad:  ['#FFBB38', '#FF9D00'],
  },
  Luteal: {
    color: '#9B67CA',
    bg:    'rgba(155,103,202,0.12)',
    label: 'Luteal',
    icon:  '🌖',
    ring:  '#C77DFF',
    grad:  ['#C77DFF', '#9B67CA'],
  },
};

/* Mock data used when backend is unavailable */
const MOCK = (function() {
  const today  = new Date();
  const lp     = new Date(today); lp.setDate(lp.getDate() - 8);
  const next   = new Date(lp);    next.setDate(next.getDate() + 28);
  const ovul   = new Date(next);  ovul.setDate(ovul.getDate() - 14);
  const fStart = new Date(ovul);  fStart.setDate(fStart.getDate() - 5);
  const fEnd   = new Date(ovul);  fEnd.setDate(fEnd.getDate() + 1);
  return {
    prediction: {
      lastPeriodDate: fmtDate(lp),
      nextPeriod:     fmtDate(next),
      ovulation:      fmtDate(ovul),
      fertileStart:   fmtDate(fStart),
      fertileEnd:     fmtDate(fEnd),
      currentPhase:   'Follicular',
      phaseDay:       8,
      cycleLength:    28,
      periodLength:   5,
      phaseSuggestion:"Energy is rising! A perfect time for new ideas and fresh plans 🌸",
      moodExpectation:"Rising energy, motivated",
      energyLevel:    "Building up steadily",
      careTip:        "Great time for light cardio and starting new projects",
    },
    cycles: [{
      id: 1, userId: '1',
      lastPeriodDate: fmtDate(lp),
      cycleLength: 28, periodLength: 5,
    }],
  };
}());

/* ───────────────────────────────────────────────────────────────
   3. THREE.JS BACKGROUND
─────────────────────────────────────────────────────────────── */
function initBackground() {
  if (typeof THREE === 'undefined') return;

  const canvas = document.getElementById('bg-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.z = 12;

  const COLORS = [0xFF6B91, 0xFFAAC2, 0xC77DFF, 0xFFD6E7, 0xE8B4FF, 0xFFBBD4];

  /* Floating blobs */
  const blobs = [];
  for (let i = 0; i < 14; i++) {
    const r   = Math.random() * 0.7 + 0.25;
    const geo = new THREE.SphereGeometry(r, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color:       COLORS[Math.floor(Math.random() * COLORS.length)],
      transparent: true,
      opacity:     Math.random() * 0.07 + 0.03,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 22,
      (Math.random() - 0.5) * 16,
      (Math.random() - 0.5) * 6,
    );
    mesh.userData = {
      vx:    (Math.random() - 0.5) * 0.004,
      vy:    (Math.random() - 0.5) * 0.003,
      phase: Math.random() * Math.PI * 2,
      amp:   Math.random() * 0.005 + 0.002,
    };
    scene.add(mesh);
    blobs.push(mesh);
  }

  /* Particle field */
  const N   = 120;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 26;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xFF9EB5, size: 0.06, transparent: true, opacity: 0.45 });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  let t = 0;
  (function tick() {
    requestAnimationFrame(tick);
    t += 0.003;

    blobs.forEach(b => {
      b.position.x += b.userData.vx;
      b.position.y += Math.sin(t + b.userData.phase) * b.userData.amp;
      if (b.position.x >  12) b.position.x = -12;
      if (b.position.x < -12) b.position.x =  12;
    });

    particles.rotation.y = t * 0.015;
    particles.rotation.x = Math.sin(t * 0.3) * 0.04;

    renderer.render(scene, camera);
  }());

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ───────────────────────────────────────────────────────────────
   4. API SERVICE
─────────────────────────────────────────────────────────────── */
async function apiFetch(method, path, body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && state.token) headers['Authorization'] = `Bearer ${state.token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const url = `${API}${path}`;
  console.log(`[API] ${method} ${url}`);

  let res;
  try {
    res = await fetch(url, opts);
  } catch (networkErr) {
    console.error(`[API] Network error on ${method} ${url}:`, networkErr);
    throw new Error('Cannot reach server. Check your connection or try again later.');
  }

  console.log(`[API] ${method} ${url} → ${res.status}`);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error(`[API] Error response:`, data);
    throw new Error(data.error || `Server error ${res.status}`);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return null;
  return res.json();
}

const api = {
  register:     (d)  => apiFetch('POST',   '/auth/register', d, false),
  login:        (d)  => apiFetch('POST',   '/auth/login',    d, false),
  predict:      (d)  => apiFetch('POST',   '/cycle/predict', d),
  saveCycle:    (d)  => apiFetch('POST',   '/cycle/save',    d),
  getCycles:    ()   => apiFetch('GET',    '/cycle/all'),
  deleteCycle:  (id) => apiFetch('DELETE', `/cycle/${id}`),
};

/* ───────────────────────────────────────────────────────────────
   5. AUTH MANAGEMENT
─────────────────────────────────────────────────────────────── */
function saveAuth(token, name, email) {
  state.token = token;
  state.user  = { name, email };
  localStorage.setItem('ct_token', token);
  localStorage.setItem('ct_user',  JSON.stringify({ name, email }));
}

function clearAuth() {
  state.token = null;
  state.user  = null;
  state.prediction = null;
  state.cycles = [];
  localStorage.removeItem('ct_token');
  localStorage.removeItem('ct_user');
}

function loadStoredAuth() {
  const token = localStorage.getItem('ct_token');
  const user  = localStorage.getItem('ct_user');
  if (token && user) {
    try {
      state.token = token;
      state.user  = JSON.parse(user);
      return true;
    } catch { clearAuth(); }
  }
  return false;
}

/* ───────────────────────────────────────────────────────────────
   THEME (DARK / LIGHT)
─────────────────────────────────────────────────────────────── */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ct_theme', theme);
  const moon = document.getElementById('icon-moon');
  const sun  = document.getElementById('icon-sun');
  if (theme === 'dark') {
    moon?.classList.add('hidden');
    sun?.classList.remove('hidden');
  } else {
    moon?.classList.remove('hidden');
    sun?.classList.add('hidden');
  }
}

function initTheme() {
  const saved = localStorage.getItem('ct_theme') || 'light';
  applyTheme(saved);
}

/* Compute average cycle length from history (with 28-day fallback) */
function avgCycleLength(cycles) {
  if (!cycles || cycles.length === 0) return 28;
  const sum = cycles.reduce((acc, c) => acc + (c.cycleLength || 28), 0);
  return Math.round(sum / cycles.length);
}

/* ───────────────────────────────────────────────────────────────
   6. UI UTILITIES
─────────────────────────────────────────────────────────────── */

/* Show/hide pages with transition */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

/* Switch dashboard/calendar views */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-pill').forEach(b => {
    b.classList.toggle('active', b.dataset.view === id);
  });
  const v = document.getElementById(id + '-view');
  if (v) v.classList.add('active');
}

/* Toast notification */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  requestAnimationFrame(() => { requestAnimationFrame(() => el.classList.add('show')); });
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 320);
  }, 3400);
}

/* Button loading state */
function setBtnLoading(btn, loading) {
  const txt = btn.querySelector('.btn-text');
  const spin = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  if (txt)  txt.style.opacity = loading ? '0' : '1';
  if (spin) spin.classList.toggle('hidden', !loading);
}

/* Format date as YYYY-MM-DD */
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/* Format date for display: "Apr 14" */
function displayDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* Days from today to a date string */
function daysUntil(str) {
  if (!str) return null;
  const target = new Date(str + 'T00:00:00');
  const today  = new Date(); today.setHours(0,0,0,0);
  return Math.round((target - today) / 86400000);
}

function countdownLabel(days) {
  if (days === null) return '';
  if (days === 0)  return 'Today';
  if (days === 1)  return 'Tomorrow';
  if (days < 0)   return `${Math.abs(days)}d ago`;
  return `in ${days} days`;
}

/* Update SVG progress ring */
function setRing(day, total, phase) {
  const bar   = document.getElementById('ring-bar');
  const dayEl = document.getElementById('ring-day');
  const subEl = document.getElementById('ring-sub');
  if (!bar) return;

  const C  = 2 * Math.PI * 62;          // circumference (r=62)
  const pct = Math.min(Math.max(day / total, 0), 1);
  bar.style.strokeDashoffset = C * (1 - pct);

  const p = PHASE[phase] || PHASE.Follicular;
  bar.style.stroke = p.ring || 'url(#ringGrad)';

  dayEl.textContent = day;
  subEl.textContent = `of ${total}`;
}

/* Update greeting — time-based + personalized, animated on each entry */
function updateGreeting() {
  const now = new Date();
  const h   = now.getHours();
  let timeLabel, emoji;
  if      (h < 12) { timeLabel = 'Good Morning';   emoji = '☀️';  }
  else if (h < 17) { timeLabel = 'Good Afternoon';  emoji = '🌤️'; }
  else             { timeLabel = 'Good Evening';     emoji = '🌙'; }

  /* Time label (first row) */
  const timeEl = document.getElementById('greeting-time');
  if (timeEl) timeEl.textContent = `${timeLabel} ${emoji},`;

  /* Name (second row) */
  const nameEl = document.getElementById('greeting-name');
  if (nameEl && state.user) {
    const first = state.user.name.split(' ')[0];
    nameEl.textContent = `${first} 👋`;
  }

  /* Live date chip */
  const chipEl = document.getElementById('live-date-chip');
  if (chipEl) {
    chipEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  }

  /* Avatar initial */
  const av = document.getElementById('user-avatar');
  if (av && state.user) av.textContent = state.user.name[0].toUpperCase();

  /* Re-trigger greeting animation */
  const section = document.querySelector('.greeting-section');
  if (section) {
    section.style.animation = 'none';
    section.offsetHeight; // reflow
    section.style.animation = '';
  }
}

/* Update "Day X of your cycle" sub-label below greeting */
function updateCycleDayLabel(pred) {
  const el = document.getElementById('cycle-day-label');
  if (!el) return;
  if (!pred) { el.textContent = ''; return; }
  el.textContent = `Currently on Day ${pred.phaseDay} of your ${pred.cycleLength}-day cycle`;
}

/* Show/hide global loading overlay */
function setOverlay(show) {
  const el = document.getElementById('loading-overlay');
  if (el) el.classList.toggle('hidden', !show);
}

/* ───────────────────────────────────────────────────────────────
   7. DASHBOARD
─────────────────────────────────────────────────────────────── */
function renderDashboard(pred) {
  if (!pred) return;
  state.prediction = pred;

  /* ── Always recompute day-in-cycle from TODAY so display is never stale ── */
  const lp      = new Date(pred.lastPeriodDate + 'T00:00:00');
  const todayMs = new Date(); todayMs.setHours(0,0,0,0);
  const rawDays = Math.round((todayMs - lp) / 86400000) + 1;
  const cycLen  = pred.cycleLength || 28;
  const liveDay = ((rawDays - 1) % cycLen + cycLen) % cycLen + 1;
  /* Override phaseDay with live computed value */
  pred = { ...pred, phaseDay: liveDay };

  const p = PHASE[pred.currentPhase] || PHASE.Follicular;

  /* Update cycle-day sub-label */
  updateCycleDayLabel(pred);

  /* Progress ring */
  setRing(pred.phaseDay, pred.cycleLength, pred.currentPhase);

  /* Phase badge */
  const badge     = document.getElementById('phase-badge');
  const phaseDot  = document.getElementById('phase-dot');
  const phaseName = document.getElementById('phase-name');
  if (badge) {
    badge.style.background = p.bg;
    badge.style.color      = p.color;
  }
  if (phaseDot)  phaseDot.style.color  = p.color;
  if (phaseName) phaseName.textContent = `${p.icon} ${p.label} Phase`;

  /* Suggestion */
  const suggEl = document.getElementById('phase-suggestion');
  if (suggEl) suggEl.textContent = pred.phaseSuggestion;

  /* Mood / Energy */
  setText('meta-mood',   pred.moodExpectation);
  setText('meta-energy', pred.energyLevel);

  /* Next period */
  const npDays = daysUntil(pred.nextPeriod);
  setText('next-period-val', displayDate(pred.nextPeriod));
  setText('next-period-cd',  countdownLabel(npDays));

  /* Ovulation */
  const ovDays = daysUntil(pred.ovulation);
  setText('ovulation-val', displayDate(pred.ovulation));
  setText('ovulation-cd',  countdownLabel(ovDays));

  /* Fertile window */
  setText('fertile-start', displayDate(pred.fertileStart));
  setText('fertile-end',   displayDate(pred.fertileEnd));

  /* Insight */
  const insightMap = {
    Menstrual:  "She may feel low energy and more sensitive today — warmth and gentleness go a long way 💙",
    Follicular: "Her energy is rising! Great time for new plans and creative momentum 🌸",
    Ovulation:  "Peak confidence and radiant energy today — she's absolutely glowing ✨",
    Luteal:     "She might need extra patience and comfort as her body prepares 💜",
  };
  setText('insight-text', insightMap[pred.currentPhase] || pred.phaseSuggestion);
  setText('care-text',    pred.careTip);

  /* Pre-fill form with current cycle data */
  if (pred.lastPeriodDate) {
    const lpInput = document.getElementById('last-period');
    if (lpInput && !lpInput.value) lpInput.value = pred.lastPeriodDate;
  }
  const clInput = document.getElementById('cycle-len');
  const plInput = document.getElementById('period-len');
  if (clInput && pred.cycleLength) clInput.value = pred.cycleLength;
  if (plInput && pred.periodLength) plInput.value = pred.periodLength;

  /* Offline badge */
  if (state.offlineMode) {
    const greeting = document.querySelector('.greeting-section');
    if (greeting && !greeting.querySelector('.offline-badge')) {
      const badge = document.createElement('div');
      badge.className = 'offline-badge';
      badge.textContent = '⚡ Demo mode — backend offline';
      greeting.appendChild(badge);
    }
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val || '—';
}

async function loadDashboard() {
  try {
    state.cycles = await api.getCycles();
  } catch {
    if (!state.offlineMode) {
      state.offlineMode = true;
      state.cycles = MOCK.cycles;
    }
  }

  if (state.cycles.length > 0) {
    /* Sort by date — take the LATEST cycle as the active one */
    const sorted = [...state.cycles].sort(
      (a, b) => new Date(b.lastPeriodDate) - new Date(a.lastPeriodDate)
    );
    const latest = sorted[0];

    /* Use historical average for cycle length (more accurate over time) */
    const historicalAvg = avgCycleLength(state.cycles);
    const effectiveCycleLen = sorted.length >= 2 ? historicalAvg : (latest.cycleLength || 28);

    try {
      const pred = state.offlineMode
        ? MOCK.prediction
        : await api.predict({
            lastPeriodDate: latest.lastPeriodDate,
            cycleLength:    effectiveCycleLen,
            periodLength:   latest.periodLength || 5,
          });
      renderDashboard(pred);
    } catch {
      renderDashboard(MOCK.prediction);
    }
  } else {
    /* No data yet — show helpful empty state */
    setText('phase-name',       '— No data yet');
    setText('phase-suggestion', 'Add your last period date below to get started.');
    updateCycleDayLabel(null);
    const dayEl = document.getElementById('ring-day');
    const subEl = document.getElementById('ring-sub');
    if (dayEl) dayEl.textContent = '?';
    if (subEl) subEl.textContent = 'add data';
  }
}

/* ───────────────────────────────────────────────────────────────
   8. CALENDAR
─────────────────────────────────────────────────────────────── */
function getHighlights(year, month) {
  if (!state.cycles.length) return { period: new Set(), fertile: new Set(), ovulation: new Set() };

  const sorted = [...state.cycles].sort(
    (a, b) => new Date(b.lastPeriodDate) - new Date(a.lastPeriodDate)
  );
  const c      = sorted[0];
  const cycLen = c.cycleLength  || 28;
  const perLen = c.periodLength || 5;
  const base   = new Date(c.lastPeriodDate + 'T00:00:00');

  const period    = new Set();
  const fertile   = new Set();
  const ovulation = new Set();

  /* Project –1 to +4 cycles to cover the visible month */
  for (let i = -1; i <= 4; i++) {
    const cStart = new Date(base);
    cStart.setDate(cStart.getDate() + i * cycLen);

    /* Period days */
    for (let d = 0; d < perLen; d++) {
      const day = new Date(cStart);
      day.setDate(day.getDate() + d);
      if (day.getFullYear() === year && day.getMonth() === month) period.add(day.getDate());
    }

    /* Ovulation */
    const ovul = new Date(cStart);
    ovul.setDate(ovul.getDate() + cycLen - 14);
    if (ovul.getFullYear() === year && ovul.getMonth() === month) ovulation.add(ovul.getDate());

    /* Fertile window (ovul - 5 to ovul + 1) */
    for (let d = -5; d <= 1; d++) {
      const fDay = new Date(ovul);
      fDay.setDate(fDay.getDate() + d);
      if (fDay.getFullYear() === year && fDay.getMonth() === month) fertile.add(fDay.getDate());
    }
  }

  return { period, fertile, ovulation };
}

function renderCalendar() {
  const year  = state.calDate.getFullYear();
  const month = state.calDate.getMonth();

  /* Title */
  setText('cal-title', new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  }));

  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const hl         = getHighlights(year, month);
  const today      = new Date(); today.setHours(0,0,0,0);

  const grid = document.getElementById('cal-grid');
  if (!grid) return;
  grid.innerHTML = '';

  /* Leading empty cells */
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  /* Day cells */
  for (let d = 1; d <= daysInMonth; d++) {
    const cell    = document.createElement('div');
    cell.className = 'cal-day';
    cell.textContent = d;

    const thisDay = new Date(year, month, d); thisDay.setHours(0,0,0,0);
    const isToday = thisDay.getTime() === today.getTime();

    if (hl.period.has(d))    cell.classList.add('period-day');
    if (hl.ovulation.has(d)) cell.classList.add('ovulation-day');
    else if (hl.fertile.has(d)) cell.classList.add('fertile-day');
    if (isToday) cell.classList.add('today');

    cell.addEventListener('click', () => showDayDetail(thisDay, d, hl));
    grid.appendChild(cell);
  }
}

function showDayDetail(date, dayNum, hl) {
  const panel    = document.getElementById('day-detail');
  const dateEl   = document.getElementById('detail-date');
  const infoEl   = document.getElementById('detail-info');
  if (!panel) return;

  dateEl.textContent = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const tags = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const isToday = date.getTime() === today.getTime();

  if (hl.period.has(dayNum))    tags.push({ cls: 'detail-tag-period',    txt: '🩸 Period day' });
  if (hl.ovulation.has(dayNum)) tags.push({ cls: 'detail-tag-ovulation', txt: '🥚 Ovulation day' });
  else if (hl.fertile.has(dayNum)) tags.push({ cls: 'detail-tag-fertile', txt: '🌸 Fertile window' });
  if (isToday) tags.push({ cls: 'detail-tag-today', txt: '📅 Today' });
  if (!tags.length) tags.push({ cls: 'detail-tag-normal', txt: 'Regular day' });

  infoEl.innerHTML = tags.map(t =>
    `<div class="detail-tag ${t.cls}">${t.txt}</div>`
  ).join('');

  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ───────────────────────────────────────────────────────────────
   9. HISTORY VIEW
─────────────────────────────────────────────────────────────── */

/** Render the full history view from state.cycles */
function renderHistory() {
  const cycles = [...state.cycles].sort(
    (a, b) => new Date(b.lastPeriodDate) - new Date(a.lastPeriodDate)
  );

  /* ── Stats ── */
  const total      = cycles.length;
  const avgCycle   = total ? Math.round(cycles.reduce((s, c) => s + (c.cycleLength || 28), 0) / total) : null;
  const avgPeriod  = total ? Math.round(cycles.reduce((s, c) => s + (c.periodLength || 5), 0) / total) : null;

  setText('stat-total',      total);
  setText('stat-avg-cycle',  avgCycle  ? `${avgCycle}d`  : '—');
  setText('stat-avg-period', avgPeriod ? `${avgPeriod}d` : '—');

  const subtitleEl = document.getElementById('hist-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = total
      ? `${total} period${total > 1 ? 's' : ''} tracked · ${cycleSpanLabel(cycles)}`
      : 'No cycles logged yet';
  }

  /* ── Timeline ── */
  const timeline = document.getElementById('hist-timeline');
  if (!timeline) return;

  timeline.innerHTML = '';

  if (!total) {
    timeline.innerHTML = `
      <div class="hist-empty" id="hist-empty">
        <div class="hist-empty-icon">🌸</div>
        <p>No cycles logged yet</p>
        <p class="hist-empty-sub">Use "Log a Period" above to start tracking your history</p>
      </div>`;
    return;
  }

  const today = new Date(); today.setHours(0,0,0,0);

  cycles.forEach((c, idx) => {
    const startDate = new Date(c.lastPeriodDate + 'T00:00:00');
    const daysAgo   = Math.round((today - startDate) / 86400000);
    const agoLabel  = daysAgo === 0 ? 'Today'
                    : daysAgo === 1 ? 'Yesterday'
                    : daysAgo  < 0  ? `in ${Math.abs(daysAgo)} days`
                    : `${daysAgo} days ago`;

    /* Estimate phase at that cycle's start (always Menstrual day 1) */
    const phaseLabel = idx === 0 ? guessCurrentPhase(c) : 'Menstrual';

    const entry = document.createElement('div');
    entry.className = 'hist-entry';
    entry.dataset.id = c.id;
    entry.style.animationDelay = `${idx * 0.06}s`;
    entry.innerHTML = `
      <div class="hist-entry-header">
        <div>
          <div class="hist-entry-date">
            🩸 ${startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <div class="hist-entry-ago">${agoLabel}</div>
        </div>
        <button class="hist-delete-btn" data-id="${c.id}" title="Delete entry" aria-label="Delete this entry">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/>
            <path d="M10,11v6"/>
            <path d="M14,11v6"/>
            <path d="M9,6V4h6v2"/>
          </svg>
        </button>
      </div>
      <div class="hist-entry-tags">
        <span class="hist-tag hist-tag-cycle">🔄 ${c.cycleLength || 28}-day cycle</span>
        <span class="hist-tag hist-tag-period">📅 ${c.periodLength || 5}-day period</span>
        ${idx === 0 ? `<span class="hist-tag hist-tag-phase">✨ ${phaseLabel} Phase now</span>` : ''}
      </div>`;

    entry.querySelector('.hist-delete-btn').addEventListener('click', () => handleDeleteCycle(c.id, entry));
    timeline.appendChild(entry);
  });
}

/** Guess current phase for the latest cycle entry */
function guessCurrentPhase(c) {
  const lp      = new Date(c.lastPeriodDate + 'T00:00:00');
  const today   = new Date(); today.setHours(0,0,0,0);
  const raw     = Math.round((today - lp) / 86400000) + 1;
  const cycLen  = c.cycleLength  || 28;
  const perLen  = c.periodLength || 5;
  const day     = ((raw - 1) % cycLen + cycLen) % cycLen + 1;
  if (day <= perLen)          return 'Menstrual';
  if (day <= cycLen / 2)      return 'Follicular';
  if (day <= cycLen - 12)     return 'Ovulation';
  return 'Luteal';
}

/** Describe span of tracked history */
function cycleSpanLabel(cycles) {
  if (cycles.length < 2) return '';
  const newest = new Date(cycles[0].lastPeriodDate + 'T00:00:00');
  const oldest = new Date(cycles[cycles.length - 1].lastPeriodDate + 'T00:00:00');
  const months = Math.round((newest - oldest) / (30 * 86400000));
  return months > 1 ? `${months} months of data` : 'recent entries';
}

/** Delete a cycle entry */
async function handleDeleteCycle(id, entryEl) {
  if (!confirm('Remove this period entry?')) return;
  try {
    if (!state.offlineMode) {
      await api.deleteCycle(id);
      /* Re-fetch fresh list so IDs are always accurate */
      state.cycles = await api.getCycles();
    } else {
      state.cycles = state.cycles.filter(c => c.id !== id);
    }
    /* Animate out */
    entryEl.style.transition = 'opacity 0.3s, transform 0.3s';
    entryEl.style.opacity    = '0';
    entryEl.style.transform  = 'translateX(-20px)';
    setTimeout(() => { renderHistory(); }, 320);
    toast('Entry removed', 'success');
  } catch (err) {
    toast(err.message || 'Could not delete entry', 'error');
  }
}

/** Bind the history view's own form + toggle */
function bindHistory() {
  /* Collapse toggle */
  const toggle = document.getElementById('hist-add-toggle');
  const panel  = document.getElementById('hist-add-panel');
  toggle?.addEventListener('click', () => {
    const isOpen = !panel.classList.contains('collapsed');
    panel.classList.toggle('collapsed', isOpen);
    toggle.setAttribute('aria-expanded', String(!isOpen));
  });

  /* Number steppers inside history form */
  document.querySelectorAll('#hist-add-form .num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      let val = parseInt(inp.value) || 0;
      if (btn.dataset.action === 'inc') val = Math.min(val + 1, parseInt(inp.max));
      else                              val = Math.max(val - 1, parseInt(inp.min));
      inp.value = val;
    });
  });

  /* History form submit */
  document.getElementById('hist-add-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn         = document.getElementById('hist-save-btn');
    const dateVal     = document.getElementById('hist-date').value;
    const cycleLength = parseInt(document.getElementById('hist-cycle-len').value) || 28;
    const periodLength= parseInt(document.getElementById('hist-period-len').value) || 5;

    if (!dateVal) { toast('Please select a date', 'error'); return; }

    setBtnLoading(btn, true);
    try {
      const payload = { lastPeriodDate: dateVal, cycleLength, periodLength };
      if (!state.offlineMode) {
        await api.saveCycle(payload);
        state.cycles = await api.getCycles();
      } else {
        state.cycles = [
          ...state.cycles,
          { id: Date.now(), userId: '0', lastPeriodDate: dateVal, cycleLength, periodLength },
        ];
      }

      /* If this is the most recent date, also refresh the dashboard */
      const sorted = [...state.cycles].sort((a,b) => new Date(b.lastPeriodDate) - new Date(a.lastPeriodDate));
      if (sorted[0].lastPeriodDate === dateVal) {
        const pred = state.offlineMode
          ? computeLocalPrediction(dateVal, cycleLength, periodLength)
          : await api.predict(payload);
        renderDashboard(pred);
      }

      renderHistory();
      /* Collapse form and reset date */
      document.getElementById('hist-date').value = '';
      panel?.classList.add('collapsed');
      toggle?.setAttribute('aria-expanded', 'false');
      toast('Period entry saved! 🌸', 'success');
    } catch (err) {
      toast(err.message || 'Failed to save', 'error');
    } finally {
      setBtnLoading(btn, false);
    }
  });
}

/* ───────────────────────────────────────────────────────────────
   10. EVENT HANDLERS
─────────────────────────────────────────────────────────────── */
function bindAuthForms() {
  /* Tab switching */
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');

      const tabsEl = document.querySelector('.auth-tabs');
      tabsEl.dataset.active = tab.dataset.tab;
    });
  });

  /* Password toggles */
  document.querySelectorAll('.toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
  });

  /* Login */
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pass').value;

    if (!email || !password) { toast('Please fill in all fields', 'error'); return; }

    setBtnLoading(btn, true);
    try {
      const res = await api.login({ email, password });
      saveAuth(res.token, res.name, res.email);
      toast(`Welcome back, ${res.name}! 🌸`, 'success');
      await enterApp();
    } catch (err) {
      console.error('[Login] Failed:', err);
      toast(err.message || 'Login failed. Please try again.', 'error');
      document.getElementById('login-form').classList.add('shake');
      setTimeout(() => document.getElementById('login-form').classList.remove('shake'), 400);
    } finally {
      setBtnLoading(btn, false);
    }
  });

  /* Register */
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn      = document.getElementById('register-btn');
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-pass').value;

    if (!name || !email || !password) { toast('Please fill in all fields', 'error'); return; }
    if (password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }

    setBtnLoading(btn, true);
    try {
      const res = await api.register({ name, email, password });
      saveAuth(res.token, res.name, res.email);
      toast(`Welcome, ${res.name}! 🌸`, 'success');
      await enterApp();
    } catch (err) {
      console.error('[Register] Failed:', err);
      toast(err.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setBtnLoading(btn, false);
    }
  });
}

function bindAppControls() {
  /* Theme toggle */
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  /* View navigation */
  document.querySelectorAll('.nav-pill').forEach(btn => {
    btn.addEventListener('click', async () => {
      showView(btn.dataset.view);
      if (btn.dataset.view === 'calendar') renderCalendar();
      if (btn.dataset.view === 'history') {
        /* Always fetch fresh cycles so IDs match the DB */
        if (!state.offlineMode) {
          try { state.cycles = await api.getCycles(); } catch { /* keep existing */ }
        }
        renderHistory();
      }
    });
  });

  /* Logout */
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearAuth();
    state.offlineMode = false;
    /* Reset form */
    ['last-period','cycle-len','period-len'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = id === 'cycle-len' ? '28' : id === 'period-len' ? '5' : '';
    });
    const badge = document.querySelector('.offline-badge');
    if (badge) badge.remove();
    showPage('auth-page');
    showView('dashboard');
    toast('Signed out', 'info');
  });

  /* Number stepper buttons */
  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      let val = parseInt(inp.value) || 0;
      const min = parseInt(inp.min);
      const max = parseInt(inp.max);
      if (btn.dataset.action === 'inc') val = Math.min(val + 1, max);
      else                              val = Math.max(val - 1, min);
      inp.value = val;
    });
  });

  /* Cycle form submit */
  document.getElementById('cycle-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    const lastPeriodDate = document.getElementById('last-period').value;
    const cycleLength    = parseInt(document.getElementById('cycle-len').value) || 28;
    const periodLength   = parseInt(document.getElementById('period-len').value) || 5;

    if (!lastPeriodDate) { toast('Please enter your last period date', 'error'); return; }

    setBtnLoading(btn, true);
    try {
      const payload = { lastPeriodDate, cycleLength, periodLength };

      if (!state.offlineMode) {
        await api.saveCycle(payload);
        state.cycles = await api.getCycles();
      } else {
        /* Offline: update mock state */
        state.cycles = [{ id: Date.now(), userId: '0', lastPeriodDate, cycleLength, periodLength }];
      }

      const pred = state.offlineMode
        ? computeLocalPrediction(lastPeriodDate, cycleLength, periodLength)
        : await api.predict(payload);

      renderDashboard(pred);
      toast('Cycle data saved! 🌸', 'success');
    } catch (err) {
      toast(err.message || 'Failed to save data', 'error');
    } finally {
      setBtnLoading(btn, false);
    }
  });

  /* Calendar navigation */
  document.getElementById('prev-month').addEventListener('click', () => {
    state.calDate.setMonth(state.calDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    state.calDate.setMonth(state.calDate.getMonth() + 1);
    renderCalendar();
  });

  /* Day detail close */
  document.getElementById('detail-close').addEventListener('click', () => {
    document.getElementById('day-detail').classList.add('hidden');
  });
}

/* Offline prediction calculation (mirrors backend logic) */
function computeLocalPrediction(lastPeriodDate, cycleLength, periodLength) {
  const lp    = new Date(lastPeriodDate + 'T00:00:00');
  const next  = new Date(lp); next.setDate(next.getDate() + cycleLength);
  const ovul  = new Date(next); ovul.setDate(ovul.getDate() - 14);
  const fSt   = new Date(ovul); fSt.setDate(fSt.getDate() - 5);
  const fEnd  = new Date(ovul); fEnd.setDate(fEnd.getDate() + 1);

  const today = new Date(); today.setHours(0,0,0,0);
  const raw   = Math.round((today - lp) / 86400000) + 1;
  const dayInCycle = ((raw - 1) % cycleLength + cycleLength) % cycleLength + 1;

  let phase, mood, energy, careTip, suggestion;
  if (dayInCycle <= periodLength) {
    phase = 'Menstrual'; mood = 'Introspective, sensitive';
    energy = 'Low — rest mode';
    careTip = 'Warm compress, iron-rich foods, stay hydrated';
    suggestion = 'She may feel low energy today — warmth and gentleness go a long way 💙';
  } else if (dayInCycle <= cycleLength / 2) {
    phase = 'Follicular'; mood = 'Rising energy, motivated';
    energy = 'Building up steadily';
    careTip = 'Great time for light cardio and starting new projects';
    suggestion = 'Energy is rising! A perfect time for new ideas and fresh plans 🌸';
  } else if (dayInCycle >= cycleLength - 15 && dayInCycle <= cycleLength - 13) {
    phase = 'Ovulation'; mood = 'Confident, social, peak energy';
    energy = 'High — peak performance';
    careTip = 'Best time for important decisions and high-intensity workouts';
    suggestion = 'Peak confidence and radiant energy today — she\'s glowing ✨';
  } else {
    phase = 'Luteal'; mood = 'Reflective, PMS possible';
    energy = 'Gradually declining';
    careTip = 'Magnesium-rich foods, gentle yoga, reduce caffeine';
    suggestion = 'She might need extra patience and comfort right now 💜';
  }

  return {
    lastPeriodDate, cycleLength, periodLength,
    nextPeriod:   fmtDate(next),
    ovulation:    fmtDate(ovul),
    fertileStart: fmtDate(fSt),
    fertileEnd:   fmtDate(fEnd),
    currentPhase: phase,
    phaseDay:     dayInCycle,
    phaseSuggestion: suggestion,
    moodExpectation: mood,
    energyLevel:  energy,
    careTip,
  };
}

/* ───────────────────────────────────────────────────────────────
   10. INITIALIZATION
─────────────────────────────────────────────────────────────── */
async function enterApp() {
  updateGreeting();
  showPage('app-page');
  setOverlay(true);

  try {
    await loadDashboard();
    renderHistory();   // pre-populate history tab stats
  } finally {
    setOverlay(false);
  }
}

async function init() {
  /* Apply saved theme immediately (before anything renders) */
  initTheme();

  /* Three.js background always runs */
  initBackground();

  /* Set today as max on both date inputs */
  const today = fmtDate(new Date());
  const lpInput = document.getElementById('last-period');
  if (lpInput) lpInput.max = today;
  const histInput = document.getElementById('hist-date');
  if (histInput) histInput.max = today;

  /* Bind all form/button handlers */
  bindAuthForms();
  bindAppControls();
  bindHistory();

  /* Check for stored session */
  if (loadStoredAuth()) {
    await enterApp();
  } else {
    showPage('auth-page');
  }
}

document.addEventListener('DOMContentLoaded', init);
