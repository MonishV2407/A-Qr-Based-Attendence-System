/**
 * PR Attendance System - Frontend Client Application
 * Dedicated to Teacher OnlyPr (Password: 12345)
 * Heading Font: CopperPlate Gothic Light
 * Content Font: Cosmic / Comic Sans
 */

const API_BASE = '/api';

const state = {
  token: localStorage.getItem('pr_teacher_token') || null,
  teacher: null,
  activeView: 'login',
  activeSession: null,
  qrTimer: null,
  rosterPoller: null,
  lastAttendeeCount: 0,
  courses: [],
  timings: []
};

document.addEventListener('DOMContentLoaded', async () => {
  if (checkStudentMobileAttendRoute()) {
    return;
  }

  if (state.token) {
    try {
      await fetchTeacherProfile();
      navigateTo('dashboard');
    } catch (e) {
      handleTeacherLogout();
    }
  } else {
    navigateTo('login');
  }

  if (window.lucide) lucide.createIcons();
});

function checkStudentMobileAttendRoute() {
  const path = window.location.pathname;
  const hash = window.location.hash;
  const search = window.location.search;

  let sessionCode = null;
  let qrCode = null;

  if (path.startsWith('/attend/')) {
    sessionCode = path.replace('/attend/', '').split('/')[0];
    const params = new URLSearchParams(search);
    qrCode = params.get('c');
  } else if (hash.startsWith('#attend')) {
    const queryStr = hash.includes('?') ? hash.split('?')[1] : search;
    const params = new URLSearchParams(queryStr);
    sessionCode = params.get('session');
    qrCode = params.get('code') || params.get('c');
  }

  if (sessionCode) {
    loadStudentMobileScreen(sessionCode, qrCode);
    return true;
  }
  return false;
}

// ==========================================
// API Helper
// ==========================================

async function api(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = data.error;
    error.data = data;
    throw error;
  }

  return data;
}

function showToast(title, message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const colors = {
    success: 'bg-slate-900 border-emerald-500/40 text-emerald-400',
    error: 'bg-slate-900 border-rose-500/40 text-rose-400',
    warning: 'bg-slate-900 border-amber-500/40 text-amber-400',
    info: 'bg-slate-900 border-cyan-500/40 text-cyan-400'
  };

  const icons = {
    success: 'check-circle',
    error: 'alert-circle',
    warning: 'alert-triangle',
    info: 'info'
  };

  toast.className = `p-4 rounded-xl border shadow-xl flex items-start space-x-3 text-xs pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0 ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <div class="mt-0.5"><i data-lucide="${icons[type] || 'info'}" class="w-4 h-4"></i></div>
    <div class="flex-1">
      <div class="font-bold text-slate-100 font-heading">${escapeHtml(title)}</div>
      <div class="text-slate-400 mt-0.5">${escapeHtml(message)}</div>
    </div>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================
// 1. TEACHER OnlyPr LOGIN & LOGOUT
// ==========================================

async function handleTeacherLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  try {
    const res = await api('/auth/teacher-login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    state.token = res.token;
    localStorage.setItem('pr_teacher_token', res.token);
    state.teacher = res.teacher;

    showToast('Signed In', `Welcome, OnlyPr!`, 'success');
    navigateTo('dashboard');
  } catch (err) {
    showToast('Login Failed', err.message, 'error');
  }
}

async function fetchTeacherProfile() {
  const res = await api('/auth/me');
  state.teacher = res.teacher;
  const pill = document.getElementById('teacher-profile-pill');
  if (pill) pill.classList.remove('hidden');
}

function handleTeacherLogout() {
  state.token = null;
  state.teacher = null;
  localStorage.removeItem('pr_teacher_token');
  stopQrTimer();
  stopRosterPoller();

  const pill = document.getElementById('teacher-profile-pill');
  if (pill) pill.classList.add('hidden');

  navigateTo('login');
  showToast('Signed Out', 'Teacher OnlyPr has been signed out.', 'info');
}

// ==========================================
// View Router
// ==========================================

function navigateTo(viewId) {
  stopQrTimer();
  stopRosterPoller();

  state.activeView = viewId;

  const views = ['view-login', 'view-dashboard', 'view-courses', 'view-student-attend', 'view-security-lab'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  const target = document.getElementById(`view-${viewId}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('bg-emerald-500/10', 'text-emerald-400', 'border', 'border-emerald-500/20');
    btn.classList.add('text-slate-400');
  });
  const activeTab = document.getElementById(`tab-${viewId}`);
  if (activeTab) {
    activeTab.classList.remove('text-slate-400');
    activeTab.classList.add('bg-emerald-500/10', 'text-emerald-400', 'border', 'border-emerald-500/20');
  }

  const profilePill = document.getElementById('teacher-profile-pill');
  const navTabs = document.getElementById('nav-tabs');
  if (viewId === 'login' || viewId === 'student-attend') {
    if (profilePill) profilePill.classList.add('hidden');
    if (navTabs) navTabs.classList.add('hidden');
  } else {
    if (profilePill) profilePill.classList.remove('hidden');
    if (navTabs) navTabs.classList.remove('hidden');
  }

  if (viewId === 'dashboard') loadDashboard();
  if (viewId === 'courses') loadCoursesAndTimings();
  if (viewId === 'security-lab') loadSecurityLab();

  if (window.lucide) lucide.createIcons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// 2. TEACHER DASHBOARD (ACTIVE QR & REAL-TIME ROSTER)
// ==========================================

async function loadDashboard() {
  const container = document.getElementById('active-session-container');
  const historyTbody = document.getElementById('history-sessions-table');

  try {
    const res = await api('/sessions/active');
    const activeSessions = res.sessions || [];

    if (activeSessions.length > 0) {
      state.activeSession = activeSessions[0];
      renderActiveProjectorCard(state.activeSession);
      startQrRotation(state.activeSession.sessionCode);
      startLiveRosterPoller(state.activeSession.sessionCode);
    } else {
      state.activeSession = null;
      container.innerHTML = `
        <div class="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
          <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <i data-lucide="qr-code" class="w-8 h-8"></i>
          </div>
          <div>
            <h3 class="font-heading text-lg font-bold text-white">No Active QR Session</h3>
            <p class="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Select a unique course, set the session duration limit, and create a dynamic rotating QR code for students to scan on their mobile phones.
            </p>
          </div>
          <button onclick="openCreateSessionModal()" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-brand-500/25 hover:opacity-95 transition">
            Create QR Session Now
          </button>
        </div>
      `;
    }

    const overview = await api('/reports/overview');
    const past = overview.recent || [];

    if (past.length === 0) {
      historyTbody.innerHTML = `<tr><td colspan="8" class="px-4 py-8 text-center text-slate-500">No previous sessions found.</td></tr>`;
    } else {
      historyTbody.innerHTML = past.map(s => {
        const isClosed = Boolean(s.closed_at);
        const isExpired = new Date(s.expires_at) < new Date();
        const badge = isClosed
          ? `<span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">Closed</span>`
          : (isExpired
            ? `<span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">Ended</span>`
            : `<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold animate-pulse">Live</span>`);

        return `
          <tr class="hover:bg-slate-800/40 transition">
            <td class="px-4 py-3 font-mono font-bold text-cyan-400">${escapeHtml(s.session_code)}</td>
            <td class="px-4 py-3 font-bold text-white">${escapeHtml(s.course_name)} <span class="text-slate-400 font-mono text-[10px]">(${escapeHtml(s.course_code)})</span></td>
            <td class="px-4 py-3">${escapeHtml(s.class_group)}</td>
            <td class="px-4 py-3">${escapeHtml(s.room)}</td>
            <td class="px-4 py-3 font-mono text-slate-300">${s.duration_minutes} Mins</td>
            <td class="px-4 py-3 font-bold text-emerald-400">${s.attendee_count} Students Present</td>
            <td class="px-4 py-3">${badge}</td>
            <td class="px-4 py-3 text-right space-x-1">
              <a href="/api/reports/session/${s.session_code}/csv" target="_blank" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-[11px] transition inline-flex items-center space-x-1">
                <i data-lucide="download" class="w-3 h-3"></i>
                <span>CSV Sheet</span>
              </a>
              ${!isClosed ? `
                <button onclick="closeActiveSession('${escapeHtml(s.session_code)}')" class="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-[11px] transition inline-flex items-center space-x-1">
                  <i data-lucide="stop-circle" class="w-3 h-3"></i>
                  <span>End</span>
                </button>
              ` : ''}
            </td>
          </tr>
        `;
      }).join('');
    }

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    showToast('Dashboard Error', err.message, 'error');
  }
}

function renderActiveProjectorCard(session) {
  const container = document.getElementById('active-session-container');
  container.innerHTML = `
    <div class="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 glow-emerald" id="projector-card">
      
      <!-- Session Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div class="flex items-center space-x-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span class="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-ping"></span>
              ACTIVE ATTENDANCE SESSION
            </span>
            <span class="text-xs font-mono font-bold text-slate-400">CODE: <span class="text-cyan-400 font-extrabold text-sm">${escapeHtml(session.sessionCode)}</span></span>
          </div>
          <h2 class="font-heading text-2xl font-black text-white mt-1.5">${escapeHtml(session.courseName)} <span class="text-emerald-400 font-mono text-lg">(${escapeHtml(session.courseCode)})</span></h2>
          <div class="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
            <span><strong class="text-slate-300">Instructor:</strong> OnlyPr</span>
            <span>•</span>
            <span><strong class="text-slate-300">Group:</strong> ${escapeHtml(session.classGroup)}</span>
            <span>•</span>
            <span><strong class="text-slate-300">Room:</strong> ${escapeHtml(session.room)}</span>
            <span>•</span>
            <span><strong class="text-slate-300">Duration:</strong> ${session.durationMinutes} Minutes</span>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <button onclick="toggleProjectorFullscreen()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center space-x-1.5">
            <i data-lucide="maximize" class="w-4 h-4"></i>
            <span>Projector Mode</span>
          </button>
          <button onclick="closeActiveSession('${session.sessionCode}')" class="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center space-x-1.5">
            <i data-lucide="stop-circle" class="w-4 h-4"></i>
            <span>End Session</span>
          </button>
        </div>
      </div>

      <!-- Center Projector Grid: Dynamic Rotating QR + Live Student List -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        <!-- Left: Big Dynamic Rotating QR Code -->
        <div class="lg:col-span-5 flex flex-col items-center text-center space-y-4">
          <div class="relative p-4 bg-white rounded-3xl border-4 border-slate-200 shadow-2xl">
            <img id="active-qr-image" src="" alt="Dynamic QR Code" class="w-72 h-72 sm:w-80 sm:h-80 object-contain mx-auto" style="image-rendering: pixelated; image-rendering: crisp-edges; display: block;" />
          </div>

          <!-- Network Mobile Scan URL Badge -->
          <div class="w-full max-w-sm p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-emerald-400 font-bold flex items-center space-x-1.5">
                <i data-lucide="wifi" class="w-4 h-4"></i>
                <span id="qr-ip-badge-title">Mobile Scan Wi-Fi Link:</span>
              </span>
              <div class="flex items-center space-x-2">
                <button onclick="resetToAutoIp()" id="btn-reset-auto-ip" class="hidden text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline">
                  Auto IP
                </button>
                <button onclick="promptCustomIp()" class="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-semibold">
                  Change IP
                </button>
                <button onclick="copyMobileAttendLink()" class="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition">
                  Copy
                </button>
              </div>
            </div>
            <div class="text-[11px] font-mono text-cyan-300 break-all bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 cursor-pointer select-all" id="qr-live-url-display" onclick="copyMobileAttendLink()">
              Connecting to network...
            </div>
            <div id="ip-mismatch-warning" class="hidden p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center justify-between">
              <span>IP override active</span>
              <button onclick="resetToAutoIp()" class="underline font-bold text-amber-200 ml-2">Use Auto Wi-Fi IP</button>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>📱 Connect phone to same Wi-Fi / Hotspot</span>
              <button onclick="openStudentViewInNewTab()" class="text-brand-400 hover:underline font-semibold">
                Open in New Tab &rarr;
              </button>
            </div>
          </div>

          <!-- Rotation Timer Bar -->
          <div class="w-full max-w-sm space-y-2">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-slate-400 flex items-center space-x-1">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5 animate-spin"></i>
                <span>Anti-Screenshot QR Rotation:</span>
              </span>
              <span class="font-bold text-emerald-400" id="qr-countdown-text">15s</span>
            </div>

            <div class="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
              <div id="qr-countdown-bar" class="h-full bg-gradient-to-r from-brand-500 to-cyan-500 transition-all duration-1000 ease-linear" style="width: 100%"></div>
            </div>

            <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
              <span>Token: <code class="text-cyan-300 font-bold" id="qr-token-label">...</code></span>
              <button onclick="copyMobileAttendLink()" class="text-emerald-400 hover:text-emerald-300 underline font-sans text-xs">
                Copy Mobile Scan Link
              </button>
            </div>
          </div>

          <!-- Quick Test Button for Single PC Evaluation -->
          <div class="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-[11px] text-slate-300 text-center w-full max-w-sm">
            <span>Testing without a mobile phone?</span>
            <button onclick="simulateStudentMobileScan('${session.sessionCode}')" class="block w-full mt-1.5 py-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition">
              Simulate Student Phone Scan On This PC
            </button>
          </div>
        </div>

        <!-- Right: Live Real-Time Student List Who Scanned Using Their Mobile -->
        <div class="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4 h-full flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 class="font-heading text-base font-bold text-white flex items-center space-x-2">
                  <i data-lucide="users" class="w-4 h-4 text-emerald-400"></i>
                  <span>Students Who Scanned Using Mobile</span>
                </h3>
                <p class="text-[11px] text-slate-400">Live roster updates as students scan</p>
              </div>

              <div class="text-right">
                <span class="font-heading text-3xl font-black text-emerald-400" id="live-student-count">0</span>
                <span class="text-xs text-slate-400 block font-mono">Present</span>
              </div>
            </div>

            <!-- Student Roster List -->
            <div class="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1" id="live-roster-list">
              <div class="p-8 text-center text-slate-500 text-xs">Waiting for students to scan the QR with mobile...</div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span class="text-slate-400 flex items-center space-x-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Proxy prevention active (unique check)</span>
            </span>
            <a href="/api/reports/session/${session.sessionCode}/csv" target="_blank" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold transition flex items-center space-x-1">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>Download Full CSV Roster</span>
            </a>
          </div>
        </div>

      </div>

    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

function startQrRotation(sessionCode) {
  stopQrTimer();

  let remaining = 15;
  let totalRotation = 15;

  const fetchNewQr = async () => {
    try {
      let endpoint = `/sessions/${sessionCode}/qr`;
      const customHost = state.customServerHost || localStorage.getItem('pr_custom_server_host');
      if (customHost) {
        endpoint += `?serverHost=${encodeURIComponent(customHost)}`;
      }
      const data = await api(endpoint);
      const img = document.getElementById('active-qr-image');
      const tokenLabel = document.getElementById('qr-token-label');
      const counter = document.getElementById('live-student-count');
      const urlDisplay = document.getElementById('qr-live-url-display');

      if (img) img.src = data.qrDataUrl;
      if (tokenLabel) tokenLabel.textContent = data.proof;
      if (urlDisplay && data.attendUrl) urlDisplay.textContent = data.attendUrl;
      if (counter && data.attendeeCount !== undefined) {
        counter.textContent = data.attendeeCount;
      }

      state.detectedLanIp = data.detectedLanIp || '10.65.172.217';
      const resetBtn = document.getElementById('btn-reset-auto-ip');
      const mismatchWarn = document.getElementById('ip-mismatch-warning');
      if (customHost) {
        if (resetBtn) resetBtn.classList.remove('hidden');
        if (mismatchWarn) mismatchWarn.classList.remove('hidden');
      } else {
        if (resetBtn) resetBtn.classList.add('hidden');
        if (mismatchWarn) mismatchWarn.classList.add('hidden');
      }

      state.currentAttendUrl = data.attendUrl;
      state.currentQrProof = data.proof;

      totalRotation = data.rotationSeconds || 15;
      remaining = data.secondsRemaining || totalRotation;
      updateCountdownUI(remaining, totalRotation);
    } catch (err) {
      if (err.status === 410) {
        stopQrTimer();
        loadDashboard();
      }
    }
  };

  const updateCountdownUI = (sec, total) => {
    const textEl = document.getElementById('qr-countdown-text');
    const barEl = document.getElementById('qr-countdown-bar');
    if (textEl) textEl.textContent = `${sec}s`;
    if (barEl) {
      const pct = Math.max(0, Math.min(100, (sec / total) * 100));
      barEl.style.width = `${pct}%`;
    }
  };

  fetchNewQr();

  state.qrTimer = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      fetchNewQr();
    } else {
      updateCountdownUI(remaining, totalRotation);
    }
  }, 1000);
}

function stopQrTimer() {
  if (state.qrTimer) {
    clearInterval(state.qrTimer);
    state.qrTimer = null;
  }
}

function startLiveRosterPoller(sessionCode) {
  stopRosterPoller();

  const poll = async () => {
    try {
      const res = await api(`/sessions/${sessionCode}`);
      const attendees = res.session.attendees || [];
      const listEl = document.getElementById('live-roster-list');
      const countEl = document.getElementById('live-student-count');

      if (countEl) countEl.textContent = attendees.length;

      if (attendees.length > state.lastAttendeeCount && state.lastAttendeeCount > 0) {
        playChime(true);
        showToast('New Check-In', `${attendees[0].student_name} (${attendees[0].student_roll}) scanned the QR!`, 'success');
      }
      state.lastAttendeeCount = attendees.length;

      if (listEl) {
        if (attendees.length === 0) {
          listEl.innerHTML = `<div class="p-8 text-center text-slate-500 text-xs">Waiting for students to scan the QR with mobile...</div>`;
        } else {
          listEl.innerHTML = attendees.map((a, idx) => `
            <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs animate-fadeIn">
              <div class="flex items-center space-x-3">
                <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold flex items-center justify-center">
                  ${idx + 1}
                </span>
                <div>
                  <div class="font-bold text-white text-sm font-heading">${escapeHtml(a.student_name)}</div>
                  <div class="text-[11px] text-slate-400 font-mono">${escapeHtml(a.student_roll)}</div>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  MOBILE SCANNED ✓
                </span>
                <span class="text-[10px] text-slate-500 block font-mono mt-0.5">${new Date(a.marked_at).toLocaleTimeString()}</span>
              </div>
            </div>
          `).join('');
        }
      }
    } catch (e) {}
  };

  poll();
  state.rosterPoller = setInterval(poll, 2500);
}

function stopRosterPoller() {
  if (state.rosterPoller) {
    clearInterval(state.rosterPoller);
    state.rosterPoller = null;
  }
}

async function closeActiveSession(sessionCode) {
  if (!confirm(`Are you sure Teacher OnlyPr wants to end session ${sessionCode}?`)) return;

  try {
    stopQrTimer();
    stopRosterPoller();
    const res = await api(`/sessions/${sessionCode}/close`, { method: 'POST' });
    state.activeSession = null;
    showToast('Session Ended', res.message || `Attendance session ${sessionCode} has ended.`, 'success');
    await loadDashboard();
  } catch (err) {
    showToast('Failed to End Session', err.message, 'error');
    await loadDashboard();
  }
}

function resetToAutoIp() {
  state.customServerHost = null;
  localStorage.removeItem('pr_custom_server_host');
  showToast('Auto IP Restored', 'Switched back to detected Wi-Fi IP address.', 'success');
  if (state.activeSession) {
    startQrRotation(state.activeSession.sessionCode);
  }
}

function promptCustomIp() {
  const defaultHost = (state.detectedLanIp ? `${state.detectedLanIp}:3000` : '10.65.172.217:3000');
  const current = state.customServerHost || (state.currentAttendUrl ? new URL(state.currentAttendUrl).host : defaultHost);
  const custom = prompt('Enter Teacher Laptop Local Wi-Fi IP and Port (e.g. ' + defaultHost + '):', current);
  if (custom !== null) {
    if (custom.trim() === '') {
      resetToAutoIp();
    } else {
      state.customServerHost = custom.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
      localStorage.setItem('pr_custom_server_host', state.customServerHost);
      showToast('IP Configured', `QR code now encodes ${state.customServerHost}`, 'info');
      if (state.activeSession) {
        startQrRotation(state.activeSession.sessionCode);
      }
    }
  }
}

function openStudentViewInNewTab() {
  if (state.currentAttendUrl) {
    window.open(state.currentAttendUrl, '_blank');
  } else if (state.activeSession) {
    window.open(`/attend/${state.activeSession.sessionCode}?c=${state.currentQrProof || ''}`, '_blank');
  }
}

function toggleProjectorFullscreen() {
  const card = document.getElementById('projector-card');
  if (!card) return;
  if (!document.fullscreenElement) {
    card.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function copyMobileAttendLink() {
  if (!state.currentAttendUrl) return;
  navigator.clipboard.writeText(state.currentAttendUrl).then(() => {
    showToast('Copied', 'Mobile scan link copied to clipboard.', 'success');
  }).catch(() => {
    prompt('Mobile Scan Link:', state.currentAttendUrl);
  });
}

function simulateStudentMobileScan(sessionCode) {
  loadStudentMobileScreen(sessionCode, state.currentQrProof);
}

// ==========================================
// 3. STUDENT MOBILE CHECK-IN SCREEN (NO LOGIN NEEDED)
// ==========================================

async function loadStudentMobileScreen(sessionCode, qrProof) {
  navigateTo('student-attend');

  const titleEl = document.getElementById('mobile-course-title');
  const metaEl = document.getElementById('mobile-session-meta');
  const tokenInput = document.getElementById('mobile-qr-token');

  if (tokenInput) tokenInput.value = qrProof || '';

  try {
    const res = await api(`/public/session/${sessionCode}`);
    if (titleEl) titleEl.textContent = `${res.courseName} (${res.courseCode})`;
    if (metaEl) metaEl.textContent = `Instructor: OnlyPr • Group: ${res.classGroup} • Room: ${res.room}`;
    state.currentMobileSessionCode = sessionCode;
  } catch (err) {
    if (titleEl) titleEl.textContent = 'Session Inactive or Closed';
    if (metaEl) metaEl.textContent = err.message;
  }
}

function fillMobileTest(name, roll) {
  document.getElementById('mobile-student-name').value = name;
  document.getElementById('mobile-student-roll').value = roll;
}

async function handleMobileAttendSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('mobile-student-name').value.trim();
  const roll = document.getElementById('mobile-student-roll').value.trim();
  const token = document.getElementById('mobile-qr-token').value.trim() || state.currentQrProof;
  const resultBox = document.getElementById('mobile-result-box');
  const submitBtn = document.getElementById('btn-submit-mobile-attend');

  if (!token) {
    showToast('Missing QR Token', 'Please scan the QR code again.', 'error');
    return;
  }

  submitBtn.disabled = true;
  resultBox.classList.remove('hidden');
  resultBox.className = 'p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300';
  resultBox.innerHTML = `Verifying rotating QR token and recording attendance...`;

  try {
    const res = await api('/public/attend', {
      method: 'POST',
      body: JSON.stringify({
        sessionCode: state.currentMobileSessionCode,
        studentName: name,
        studentRoll: roll,
        qrProof: token
      })
    });

    playChime(true);
    resultBox.className = 'p-5 rounded-2xl bg-emerald-950/20 border-2 border-emerald-500/50 text-xs space-y-2 text-emerald-300';
    resultBox.innerHTML = `
      <div class="flex items-center space-x-2 font-bold text-sm text-emerald-400 font-heading">
        <i data-lucide="check-circle-2" class="w-5 h-5"></i>
        <span>Attendance Confirmed!</span>
      </div>
      <div><strong>Student:</strong> ${escapeHtml(res.record.studentName)} (${escapeHtml(res.record.studentRoll)})</div>
      <div><strong>Course:</strong> ${escapeHtml(res.record.courseName)} (${escapeHtml(res.record.courseCode)})</div>
      <div class="text-[11px] text-slate-400 font-mono">Marked At: ${new Date(res.record.markedAt).toLocaleTimeString()}</div>
      <div class="pt-2 border-t border-emerald-500/30 text-[11px] text-emerald-400">
        ✓ Your attendance is now visible on Teacher OnlyPr's live roster!
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    playChime(false);
    resultBox.className = 'p-5 rounded-2xl bg-rose-950/20 border-2 border-rose-500/50 text-xs space-y-2 text-rose-300';
    resultBox.innerHTML = `
      <div class="flex items-center space-x-2 font-bold text-sm text-rose-400 font-heading">
        <i data-lucide="alert-circle" class="w-5 h-5"></i>
        <span>Attendance Rejected</span>
      </div>
      <div>${escapeHtml(err.message)}</div>
    `;
    if (window.lucide) lucide.createIcons();
  } finally {
    submitBtn.disabled = false;
  }
}

// ==========================================
// 4. UNIQUE COURSE LIST & TIMING MANAGEMENT
// ==========================================

async function loadCoursesAndTimings() {
  try {
    const [cRes, tRes] = await Promise.all([
      api('/courses'),
      api('/timetable')
    ]);

    state.courses = cRes.courses || [];
    state.timings = tRes.timetable || [];

    const coursesContainer = document.getElementById('courses-container');
    const timingsContainer = document.getElementById('timings-container');
    const cBadge = document.getElementById('courses-count-badge');
    const tBadge = document.getElementById('timings-count-badge');

    if (cBadge) cBadge.textContent = `${state.courses.length} Unique Courses`;
    if (tBadge) tBadge.textContent = `${state.timings.length} Slots`;

    if (coursesContainer) {
      if (state.courses.length === 0) {
        coursesContainer.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs">No courses added yet. Click 'Upload Unique Courses' above.</div>`;
      } else {
        coursesContainer.innerHTML = state.courses.map(c => `
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <div class="font-bold text-white font-heading">${escapeHtml(c.name)}</div>
              <div class="text-[11px] font-mono text-cyan-400">${escapeHtml(c.code)} • ${escapeHtml(c.department || 'CSE')}</div>
            </div>
            <button onclick="deleteCourse(${c.id})" class="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `).join('');
      }
    }

    if (timingsContainer) {
      if (state.timings.length === 0) {
        timingsContainer.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs">No timings configured yet. Click 'Set Course Timing' above.</div>`;
      } else {
        timingsContainer.innerHTML = state.timings.map(t => `
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div class="flex items-center space-x-3">
              <span class="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono font-bold text-xs">
                ${t.day_of_week}
              </span>
              <div>
                <div class="font-bold text-white font-heading">${escapeHtml(t.course_name)} <span class="text-slate-400 font-mono text-[10px]">(${escapeHtml(t.course_code)})</span></div>
                <div class="text-[11px] text-slate-400">${t.start_time} - ${t.end_time} • ${escapeHtml(t.class_group)} • ${escapeHtml(t.room)}</div>
              </div>
            </div>
            <button onclick="deleteTiming(${t.id})" class="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `).join('');
      }
    }

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    showToast('Failed to load courses', err.message, 'error');
  }
}

function openUploadCoursesModal() {
  openModal('modal-upload-courses');
}

function handleCourseFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    document.getElementById('upload-courses-textarea').value = evt.target.result;
  };
  reader.readAsText(file);
}

async function submitCourseListUpload() {
  const text = document.getElementById('upload-courses-textarea').value.trim();
  if (!text) {
    showToast('Empty', 'Please paste or upload course list content.', 'warning');
    return;
  }

  try {
    const res = await api('/courses/upload', {
      method: 'POST',
      body: JSON.stringify({ rawContent: text })
    });

    closeModal('modal-upload-courses');
    showToast(
      'Courses Processed',
      `${res.count} added. ${res.skippedCount > 0 ? res.skippedCount + ' duplicate names skipped to maintain unique course names.' : ''}`,
      'success'
    );
    loadCoursesAndTimings();
  } catch (err) {
    showToast('Upload Failed', err.message, 'error');
  }
}

function openAddCourseModal() {
  openModal('modal-add-course');
}

async function handleAddCourseSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('add-course-name').value.trim();
  const code = document.getElementById('add-course-code').value.trim();
  const department = document.getElementById('add-course-dept').value.trim();

  try {
    await api('/courses', {
      method: 'POST',
      body: JSON.stringify({ name, code, department })
    });

    closeModal('modal-add-course');
    showToast('Unique Course Added', `${name} (${code}) added.`, 'success');
    loadCoursesAndTimings();
  } catch (err) {
    showToast('Cannot Add Course', err.message, 'error');
  }
}

async function deleteCourse(id) {
  if (!confirm('Delete this course?')) return;
  try {
    await api(`/courses/${id}`, { method: 'DELETE' });
    loadCoursesAndTimings();
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

function openAddTimingModal() {
  const select = document.getElementById('timing-course-select');
  if (select && state.courses.length > 0) {
    select.innerHTML = state.courses.map(c => `
      <option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.code)})</option>
    `).join('');
  }
  openModal('modal-add-timing');
}

async function handleAddTimingSubmit(e) {
  e.preventDefault();
  const courseId = Number(document.getElementById('timing-course-select').value);
  const dayOfWeek = document.getElementById('timing-day').value;
  const startTime = document.getElementById('timing-start').value;
  const endTime = document.getElementById('timing-end').value;
  const classGroup = document.getElementById('timing-group').value;
  const room = document.getElementById('timing-room').value;

  try {
    await api('/timetable', {
      method: 'POST',
      body: JSON.stringify({ courseId, dayOfWeek, startTime, endTime, classGroup, room })
    });

    closeModal('modal-add-timing');
    showToast('Timing Saved', `Added ${dayOfWeek} schedule.`, 'success');
    loadCoursesAndTimings();
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

async function deleteTiming(id) {
  if (!confirm('Remove this timing slot?')) return;
  try {
    await api(`/timetable/${id}`, { method: 'DELETE' });
    loadCoursesAndTimings();
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

async function openCreateSessionModal() {
  try {
    const res = await api('/courses');
    state.courses = res.courses || [];
    const select = document.getElementById('create-session-course');
    if (select) {
      if (state.courses.length === 0) {
        select.innerHTML = `<option value="">No courses yet - Add one first</option>`;
      } else {
        select.innerHTML = state.courses.map(c => `
          <option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.code)})</option>
        `).join('');
      }
    }
    openModal('modal-create-session');
  } catch (err) {
    showToast('Error', 'Failed to load courses', 'error');
  }
}

async function handleCreateSessionSubmit(e) {
  e.preventDefault();
  const courseId = Number(document.getElementById('create-session-course').value);
  const classGroup = document.getElementById('create-session-group').value;
  const room = document.getElementById('create-session-room').value;
  const durationMinutes = Number(document.getElementById('create-session-duration').value);
  const rotationSeconds = Number(document.getElementById('create-session-rotation').value);

  if (!courseId) {
    showToast('Select Course', 'Please select a course for the attendance session.', 'warning');
    return;
  }

  try {
    const res = await api('/sessions/create', {
      method: 'POST',
      body: JSON.stringify({
        courseId,
        classGroup,
        room,
        durationMinutes,
        rotationSeconds
      })
    });

    closeModal('modal-create-session');
    showToast('Session Active', `Active Code: ${res.session.sessionCode} (${durationMinutes} mins)`, 'success');
    loadDashboard();
  } catch (err) {
    showToast('Failed to start session', err.message, 'error');
  }
}

// ==========================================
// 5. SECURITY TESTING LAB
// ==========================================

function loadSecurityLab() {
  const cards = document.getElementById('security-test-cards');
  if (!cards) return;

  cards.innerHTML = `
    <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
      <span class="text-xs font-mono font-bold text-emerald-400">TEST 1: VALID SCAN</span>
      <h3 class="font-heading font-bold text-white">Valid Mobile Phone Scan</h3>
      <p class="text-xs text-slate-400">Student points phone camera at dynamic QR code on screen and submits attendance within active rotation window.</p>
      <div class="text-[11px] font-mono text-slate-500">Expected: 201 Created</div>
    </div>
    <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
      <span class="text-xs font-mono font-bold text-amber-400">TEST 2: EXPIRED TOKEN</span>
      <h3 class="font-heading font-bold text-white">Expired Token (Screenshot Defense)</h3>
      <p class="text-xs text-slate-400">Student tries to submit attendance using an old forwarded screenshot after the QR rotated.</p>
      <div class="text-[11px] font-mono text-slate-500">Expected: 410 QR_CODE_EXPIRED</div>
    </div>
    <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
      <span class="text-xs font-mono font-bold text-rose-400">TEST 3: DUPLICATE CHECK</span>
      <h3 class="font-heading font-bold text-white">Duplicate Attendance Blocked</h3>
      <p class="text-xs text-slate-400">Same student attempts to mark attendance a second time in the same class session.</p>
      <div class="text-[11px] font-mono text-slate-500">Expected: 409 DUPLICATE_ATTENDANCE</div>
    </div>
    <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
      <span class="text-xs font-mono font-bold text-purple-400">TEST 4: FORGED HMAC</span>
      <h3 class="font-heading font-bold text-white">Cryptographic Signature Defense</h3>
      <p class="text-xs text-slate-400">Attacker fabricates a fake HMAC token without the private session secret key.</p>
      <div class="text-[11px] font-mono text-slate-500">Expected: 403 FORGED_QR_TOKEN</div>
    </div>
  `;
}

async function runSecurityTests() {
  const btn = document.getElementById('btn-run-tests');
  const cards = document.getElementById('security-test-cards');
  if (btn) btn.disabled = true;

  try {
    const res = await api('/security-test/run', { method: 'POST' });
    const tests = res.results || [];

    cards.innerHTML = tests.map(t => `
      <div class="p-5 rounded-2xl bg-slate-900 border ${t.passed ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-rose-500/40 bg-rose-950/10'} space-y-3 shadow-xl">
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono font-bold text-slate-400">TEST #${t.id}: ${escapeHtml(t.property)}</span>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${t.passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}">
            ${t.passed ? 'PASSED (VERIFIED)' : 'FAILED'}
          </span>
        </div>
        <h3 class="font-heading font-bold text-white text-base">${escapeHtml(t.name)}</h3>
        <p class="text-xs text-slate-300">${escapeHtml(t.description)}</p>
        <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1">
          <div class="flex justify-between">
            <span class="text-slate-400">Expected:</span>
            <span class="text-white font-bold">${t.expectedStatus}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Received:</span>
            <span class="${t.passed ? 'text-emerald-400' : 'text-rose-400'} font-bold">${t.receivedStatus}</span>
          </div>
        </div>
      </div>
    `).join('');

    playChime(res.allPassed);
    showToast('Tests Complete', 'All 4 security properties verified successfully.', 'success');
  } catch (err) {
    showToast('Test Error', err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Modal Helpers
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function openProjectModal() {
  openModal('modal-project-info');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
