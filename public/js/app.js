/**
 * app.js — Global state, API helpers, notifications, auth
 */

window.App = (() => {
  // ── State ────────────────────────────────────────────────────────
  const state = {
    unlocked: false,
    sessions: [],       // loaded session list (credentials redacted)
    snippets: [],
    presets: [],
    activeTabId: null,
    tabs: [],           // [{ id, sessionId, label, osType, panes:[paneId] }]
    panes: {},          // paneId → { sessionId, term, ws, connected }
    selectedPanes: new Set(), // for multi-exec
  };

  // ── API helpers ──────────────────────────────────────────────────
  async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch('/api' + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ── Notifications ─────────────────────────────────────────────────
  function notify(msg, type = 'info', ms = 3000) {
    const el = document.createElement('div');
    el.className = `notif ${type}`;
    el.textContent = msg;
    document.getElementById('notifications').appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  // ── Auth ──────────────────────────────────────────────────────────
  async function checkAuth() {
    const status = await api('GET', '/auth/status');
    if (!status.configured) {
      showSetupOverlay();
    } else if (!status.unlocked) {
      showUnlockOverlay();
    } else {
      state.unlocked = true;
      hideAuthOverlay();
      await loadAll();
    }
  }

  function showSetupOverlay() {
    const box = document.getElementById('auth-box');
    box.querySelector('.logo').textContent = '🔐';
    box.querySelector('h1').textContent = 'WebSSH 설정';
    box.querySelector('p').textContent = '마스터 패스워드를 설정하세요';
    document.getElementById('auth-input').placeholder = '새 마스터 패스워드';
    document.getElementById('auth-btn').textContent = '설정하기';
    document.getElementById('auth-btn').onclick = async () => {
      const pw = document.getElementById('auth-input').value;
      try {
        await api('POST', '/auth/setup', { password: pw });
        state.unlocked = true;
        hideAuthOverlay();
        await loadAll();
        notify('마스터 패스워드가 설정되었습니다', 'success');
      } catch (e) {
        document.getElementById('auth-error').textContent = e.message;
      }
    };
    document.getElementById('auth-overlay').classList.remove('hidden');
  }

  function showUnlockOverlay() {
    const box = document.getElementById('auth-box');
    box.querySelector('.logo').textContent = '🔒';
    box.querySelector('h1').textContent = 'WebSSH';
    box.querySelector('p').textContent = '마스터 패스워드로 잠금 해제';
    document.getElementById('auth-input').placeholder = '마스터 패스워드';
    document.getElementById('auth-input').value = '';
    document.getElementById('auth-btn').textContent = '잠금 해제';
    document.getElementById('auth-btn').onclick = async () => {
      const pw = document.getElementById('auth-input').value;
      try {
        await api('POST', '/auth/unlock', { password: pw });
        state.unlocked = true;
        hideAuthOverlay();
        await loadAll();
        notify('잠금 해제됨', 'success');
      } catch (e) {
        document.getElementById('auth-error').textContent = '패스워드가 틀렸습니다';
      }
    };
    document.getElementById('auth-overlay').classList.remove('hidden');
    document.getElementById('auth-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('auth-btn').click();
    }, { once: true });
  }

  function hideAuthOverlay() {
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('status-bar').className = 'unlocked';
    document.getElementById('sb-lock-status').textContent = '🔓 잠금 해제됨';
  }

  async function lock() {
    await api('POST', '/auth/lock');
    state.unlocked = false;
    state.sessions = [];
    state.snippets = [];
    // Disconnect all panes
    for (const paneId in state.panes) window.TermManager.disconnectPane(paneId);
    document.getElementById('status-bar').className = 'locked';
    document.getElementById('sb-lock-status').textContent = '🔒 잠금됨';
    showUnlockOverlay();
  }

  // ── Load all data ─────────────────────────────────────────────────
  async function loadAll() {
    const [sessions, snippets, presets] = await Promise.all([
      api('GET', '/sessions'),
      api('GET', '/snippets'),
      api('GET', '/presets'),
    ]);
    state.sessions = sessions;
    state.snippets = snippets;
    state.presets  = presets;
    window.Sidebar.render();
    updateStatusBar();
  }

  function updateStatusBar() {
    document.getElementById('sb-sessions').textContent = `💻 ${state.sessions.length} 세션`;
    const active = Object.values(state.panes).filter(p => p.connected).length;
    document.getElementById('sb-connected').textContent = active ? `🟢 ${active} 연결됨` : '';
  }

  // ── Init ─────────────────────────────────────────────────────────
  function init() {
    // Lock button
    document.getElementById('btn-lock').addEventListener('click', () => {
      if (confirm('잠금하시겠습니까?')) lock();
    });

    // Enter key on auth input
    document.getElementById('auth-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('auth-btn').click();
    });

    checkAuth();
  }

  return { state, api, notify, loadAll, updateStatusBar, init, lock };
})();
