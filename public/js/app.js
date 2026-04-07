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
    box.querySelector('h1').textContent = 'AiTTY Setup';
    box.querySelector('p').textContent = 'Set your Master Password';
    document.getElementById('auth-input').placeholder = 'New Master Password';
    document.getElementById('auth-btn').textContent = 'Set Password';
    document.getElementById('auth-btn').onclick = async () => {
      const pw = document.getElementById('auth-input').value;
      try {
        await api('POST', '/auth/setup', { password: pw });
        state.unlocked = true;
        hideAuthOverlay();
        await loadAll();
        notify('Master password has been set', 'success');
      } catch (e) {
        document.getElementById('auth-error').textContent = e.message;
      }
    };
    document.getElementById('auth-overlay').classList.remove('hidden');
  }

  function showUnlockOverlay() {
    const box = document.getElementById('auth-box');
    box.querySelector('.logo').textContent = '🔒';
    box.querySelector('h1').textContent = 'AiTTY';
    box.querySelector('p').textContent = 'Unlock with Master Password';
    document.getElementById('auth-input').placeholder = 'Master Password';
    document.getElementById('auth-input').value = '';
    document.getElementById('auth-btn').textContent = 'Unlock';
    document.getElementById('auth-btn').onclick = async () => {
      const pw = document.getElementById('auth-input').value;
      try {
        await api('POST', '/auth/unlock', { password: pw });
        state.unlocked = true;
        hideAuthOverlay();
        await loadAll();
        notify('Unlocked', 'success');
      } catch (e) {
        document.getElementById('auth-error').textContent = 'Incorrect password';
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
    document.getElementById('sb-lock-status').textContent = '🔓 Unlocked';
  }

  async function lock() {
    await api('POST', '/auth/lock');
    state.unlocked = false;
    state.sessions = [];
    state.snippets = [];
    // Disconnect all panes
    for (const paneId in state.panes) window.TermManager.disconnectPane(paneId);
    document.getElementById('status-bar').className = 'locked';
    document.getElementById('sb-lock-status').textContent = '🔒 Locked';
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
    document.getElementById('sb-sessions').textContent = `💻 ${state.sessions.length} Session(s)`;
    const active = Object.values(state.panes).filter(p => p.connected).length;
    document.getElementById('sb-connected').textContent = active ? `🟢 ${active} Connected` : '';
  }

  // ── Init ─────────────────────────────────────────────────────────
  function init() {
    // Lock button
    document.getElementById('btn-lock').addEventListener('click', () => {
      if (confirm('Lock the application?')) lock();
    });

    // Enter key on auth input
    document.getElementById('auth-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('auth-btn').click();
    });

    checkAuth();
  }

  return { state, api, notify, loadAll, updateStatusBar, init, lock };
})();
