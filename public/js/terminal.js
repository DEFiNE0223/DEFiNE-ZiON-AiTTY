/**
 * terminal.js — Pane/tab/split management + xterm.js
 * Session log buffering built-in (prevents browser slowdown)
 */
window.TermManager = (() => {
  const state = App.state;
  let ws = null;
  let paneCounter = 0;
  const LOG_BUFFER_SIZE = 5000;   // lines kept in memory
  const LOG_FLUSH_INTERVAL = 5000; // ms between server-side log saves

  // ── Output listeners (for AI agent capture) ───────────────────────
  const _outputListeners = [];
  function addOutputListener(fn)    { _outputListeners.push(fn); }
  function removeOutputListener(fn) {
    const i = _outputListeners.indexOf(fn);
    if (i >= 0) _outputListeners.splice(i, 1);
  }
  function sendInput(paneId, data) {
    if (ws && ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ type: 'input', paneId, data }));
  }

  // Track last focused pane for snippet/command targeting
  let _lastFocusedPaneId = null;
  function setFocusedPane(paneId) { _lastFocusedPaneId = paneId; }
  function getActivePaneId() {
    // Prefer last focused pane (if still visible), else first visible pane
    if (_lastFocusedPaneId) {
      const el = document.getElementById('pane_el_' + _lastFocusedPaneId);
      if (el && el.style.display !== 'none') return _lastFocusedPaneId;
    }
    return Object.keys(state.panes).find(id => {
      const el = document.getElementById('pane_el_' + id);
      return el && el.style.display !== 'none';
    }) || null;
  }

  // ── WebSocket ──────────────────────────────────────────────────────
  function getWS() {
    if (ws && ws.readyState === WebSocket.OPEN) return ws;
    ws = new WebSocket(`ws://${location.host}`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      const pane = state.panes[msg.paneId];
      if (!pane) return;
      if (msg.type === 'output') {
        pane.term.write(msg.data);
        bufferLog(msg.paneId, msg.data);
        _outputListeners.forEach(fn => { try { fn(msg.paneId, msg.data); } catch {} });
      } else if (msg.type === 'connected') {
        pane.connected = true;
        pane.waitingClose = false;
        pane.term.write('\r\n\x1b[32m✓ Connected\x1b[0m\r\n');
        hideOverlay(msg.paneId);
        App.updateStatusBar();
        updateTabStatus(msg.paneId, true);
      } else if (msg.type === 'disconnected') {
        pane.connected = false;
        pane.waitingClose = true;
        pane.term.write('\r\n\x1b[31m✗ Disconnected\x1b[0m  \x1b[90m[Enter] Close\x1b[0m\r\n');
        App.updateStatusBar();
        updateTabStatus(msg.paneId, false);
        showOverlayError(msg.paneId, '✗ Disconnected — click Close or press Enter');
      } else if (msg.type === 'error') {
        pane.connected = false;
        pane.waitingClose = true;
        App.notify(msg.message, 'error');
        updateTabStatus(msg.paneId, false);
        showOverlayError(msg.paneId, msg.message);
      }
    };
    ws.onclose = () => setTimeout(getWS, 2000);
    return ws;
  }

  // ── Log buffering (reduces memory, prevents Chrome slowdown) ──────
  const logBuffers = {};   // paneId → { lines: [], timer }

  function bufferLog(paneId, data) {
    if (!logBuffers[paneId]) logBuffers[paneId] = { lines: [], dirty: false };
    const buf = logBuffers[paneId];
    // Split on newlines, keep last LOG_BUFFER_SIZE lines
    const newLines = data.split('\n');
    buf.lines.push(...newLines);
    if (buf.lines.length > LOG_BUFFER_SIZE) buf.lines = buf.lines.slice(-LOG_BUFFER_SIZE);
    buf.dirty = true;
  }

  function startLogFlush(paneId, sessionId) {
    const timer = setInterval(async () => {
      const buf = logBuffers[paneId];
      if (!buf || !buf.dirty) return;
      buf.dirty = false;
      try {
        await App.api('POST', '/sessions/' + sessionId + '/log', { content: buf.lines.join('\n') });
      } catch {}
    }, LOG_FLUSH_INTERVAL);
    return timer;
  }

  function stopLogFlush(paneId) {
    const buf = logBuffers[paneId];
    if (buf && buf.timer) { clearInterval(buf.timer); }
    delete logBuffers[paneId];
  }

  // ── xterm scrollback control (performance) ─────────────────────────
  function createTerm() {
    const term = new Terminal({
      theme: {
        background: '#11111b', foreground: '#cdd6f4', cursor: '#f5e0dc',
        selectionBackground: '#45475a',
        black: '#45475a', red: '#f38ba8', green: '#a6e3a1', yellow: '#f9e2af',
        blue: '#89b4fa', magenta: '#cba6f7', cyan: '#89dceb', white: '#bac2de',
      },
      fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
      fontSize: 14,
      cursorBlink: true,
      scrollback: 3000,   // limit scrollback to prevent memory bloat
      convertEol: false,
    });
    return term;
  }

  // ── Pane management ───────────────────────────────────────────────
  function newPaneId() { return 'pane_' + (++paneCounter); }

  function createPaneEl(paneId, title) {
    const div = document.createElement('div');
    div.className = 'pane';
    div.id = 'pane_el_' + paneId;
    div.innerHTML = `
      <div class="pane-header" draggable="true"
           ondragstart="TermManager.paneDragStart(event,'${paneId}')"
           ondragover="TermManager.paneDragOver(event,'${paneId}')"
           ondragleave="TermManager.paneDragLeave(event,'${paneId}')"
           ondrop="TermManager.paneDrop(event,'${paneId}')">
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
          <input type="checkbox" onchange="TermManager.toggleMultiSelect('${paneId}',this.checked)" data-tip="Select for multi-command execution">
        </label>
        <span class="pane-title" id="ptitle_${paneId}">${title}</span>
        <button class="pane-btn" onclick="TermManager.splitH('${paneId}')" data-tip="Split Horizontal"><span class="split-icon h"><em></em><em></em></span></button>
        <button class="pane-btn" onclick="TermManager.splitV('${paneId}')" data-tip="Split Vertical"><span class="split-icon v"><em></em><em></em></span></button>
        <button class="pane-btn" onclick="PresetPanel.toggle('${paneId}')" data-tip="OS Command Panel">🔧</button>
        <button class="pane-btn" onclick="AiPanel.toggle('${paneId}')" data-tip="AI Assistant">🤖</button>
        <button class="pane-btn" onclick="TermManager.closePane('${paneId}')" data-tip="Close Panel" style="color:var(--red)">✕</button>
      </div>
      <div class="pane-terminal" id="pterm_${paneId}"></div>
      <div class="pane-overlay" id="poverlay_${paneId}">
        <div id="poverlay_icon_${paneId}" style="font-size:32px">🔌</div>
        <h3>${title}</h3>
        <p id="poverlay_msg_${paneId}">Connecting to session...</p>
        <button id="poverlay_btn_${paneId}" class="btn-primary" style="display:none;margin-top:8px" onclick="TermManager.closePane('${paneId}',true)">✕ Close</button>
      </div>`;
    return div;
  }

  function showOverlayError(paneId, msg) {
    const icon = document.getElementById('poverlay_icon_' + paneId);
    const txt  = document.getElementById('poverlay_msg_'  + paneId);
    const btn  = document.getElementById('poverlay_btn_'  + paneId);
    if (icon) icon.textContent = '❌';
    if (txt)  txt.textContent  = msg;
    if (btn)  btn.style.display = '';
    const overlay = document.getElementById('poverlay_' + paneId);
    if (overlay) overlay.style.display = '';
  }

  function mountTerm(paneId) {
    const termEl = document.getElementById('pterm_' + paneId);
    const pane   = state.panes[paneId];
    const term   = pane.term;
    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(termEl);
    fitAddon.fit();
    pane.fitAddon = fitAddon;

    // Track which pane was last interacted with (mousedown on terminal area)
    termEl.addEventListener('mousedown', () => setFocusedPane(paneId), { capture: true });

    term.onData(data => {
      setFocusedPane(paneId);
      const p = state.panes[paneId];
      // Enter on disconnected pane → close it
      if (p && p.waitingClose && (data === '\r' || data === '\n')) {
        closePane(paneId, true);
        return;
      }
      if (ws && ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'input', paneId, data }));
    });

    const ro = new ResizeObserver(() => { fitAddon.fit(); sendResize(paneId); });
    ro.observe(termEl);
    pane.ro = ro;
  }

  function sendResize(paneId) {
    const pane = state.panes[paneId];
    if (!pane || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'resize', paneId, cols: pane.term.cols, rows: pane.term.rows }));
  }

  function hideOverlay(paneId) {
    const el = document.getElementById('poverlay_' + paneId);
    if (el) el.style.display = 'none';
  }

  function updateTabStatus(paneId, connected) {
    const tab = state.tabs.find(t => t.panes.includes(paneId));
    if (!tab) return;
    const el = document.querySelector(`.tab[data-tabid="${tab.id}"] .tab-icon`);
    if (el) el.textContent = connected ? '🟢' : '🔴';
  }

  // ── Connect new pane ──────────────────────────────────────────────
  function connectNewPane(sessionId) {
    const session = state.sessions.find(s => s.id === sessionId);
    if (!session) return;
    const preset = App.state.presets.find(p => p.id === session.osType) || {};
    const paneId = newPaneId();
    const title  = session.name;

    // Create pane state
    state.panes[paneId] = { sessionId, term: createTerm(), connected: false, logTimer: null };

    // Check if there's an active tab; if not, create one
    let tab = state.tabs.find(t => t.id === state.activeTabId);
    if (!tab) {
      tab = createTab(session, paneId);
    } else {
      // Add to existing tab's first pane container
      tab.panes.push(paneId);
    }

    // Hide welcome screen once any pane opens
    const welcome = document.getElementById('welcome');
    if (welcome) welcome.style.display = 'none';

    // Create pane element
    const paneEl = createPaneEl(paneId, title);
    const container = document.getElementById('pane-area');
    container.appendChild(paneEl);

    setTimeout(() => {
      mountTerm(paneId);
      // Connect via WS
      getWS();
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'connect', paneId, sessionId }));
        } else {
          ws.addEventListener('open', () => {
            ws.send(JSON.stringify({ type: 'connect', paneId, sessionId }));
          }, { once: true });
        }
        // Start log flush
        const timer = startLogFlush(paneId, sessionId);
        state.panes[paneId].logTimer = timer;
      }, 100);
    }, 50);

    // Update preset panel
    PresetPanel.setPreset(paneId, preset);
    renderTabs();
  }

  // ── Tab management ────────────────────────────────────────────────
  function createTab(session, paneId) {
    const preset = App.state.presets.find(p => p.id === session.osType) || {};
    const tabId  = 'tab_' + Date.now();
    const tab    = { id: tabId, sessionId: session.id, label: session.name, icon: preset.icon || '💻', panes: [paneId] };
    state.tabs.push(tab);
    state.activeTabId = tabId;
    return tab;
  }

  function renderTabs() {
    const bar = document.getElementById('tab-bar');
    let html  = '';
    for (const tab of state.tabs) {
      const active = tab.id === state.activeTabId ? 'active' : '';
      html += `<div class="tab ${active}" data-tabid="${tab.id}" onclick="TermManager.switchTab('${tab.id}')">
        <span class="tab-icon">${tab.icon}</span>
        <span class="tab-name">${esc(tab.label)}</span>
        <span class="tab-close" onclick="TermManager.closeTab(event,'${tab.id}')">×</span>
      </div>`;
    }
    html += `<button id="btn-new-tab" onclick="Modals.showNewSession()">＋</button>`;
    bar.innerHTML = html;
  }

  function switchTab(tabId) {
    state.activeTabId = tabId;
    // Show/hide panes
    const allPaneIds = Object.keys(state.panes);
    const tab = state.tabs.find(t => t.id === tabId);
    for (const paneId of allPaneIds) {
      const el = document.getElementById('pane_el_' + paneId);
      if (el) el.style.display = tab && tab.panes.includes(paneId) ? '' : 'none';
    }
    renderTabs();
    // Refit all visible panes
    if (tab) for (const pid of tab.panes) {
      const p = state.panes[pid];
      if (p && p.fitAddon) setTimeout(() => p.fitAddon.fit(), 50);
    }
  }

  function closeTab(e, tabId) {
    e.stopPropagation();
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;
    if (!confirm(`Close tab "${tab.label}"?`)) return;
    for (const paneId of tab.panes) closePane(paneId, true);
    state.tabs = state.tabs.filter(t => t.id !== tabId);
    if (state.activeTabId === tabId) {
      state.activeTabId = state.tabs[0]?.id || null;
    }
    // Switch to the next active tab so its panes become visible
    if (state.activeTabId) {
      switchTab(state.activeTabId);
    } else {
      renderTabs();
    }
  }

  // ── Split screen ──────────────────────────────────────────────────
  function splitH(paneId) { splitPane(paneId, 'horizontal'); }
  function splitV(paneId) { splitPane(paneId, 'vertical'); }

  function splitPane(existingPaneId, direction) {
    const pane = state.panes[existingPaneId];
    if (!pane) return;
    const session = state.sessions.find(s => s.id === pane.sessionId);
    if (!session) return;

    const newPaneId = 'pane_' + (++paneCounter);
    const newPaneEl = createPaneEl(newPaneId, session.name);
    state.panes[newPaneId] = { sessionId: pane.sessionId, term: createTerm(), connected: false };

    const existingEl = document.getElementById('pane_el_' + existingPaneId);
    const parent     = existingEl.parentElement;

    // Wrap existing pane + new pane in a flex container
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `display:flex;flex:1;overflow:hidden;flex-direction:${direction === 'horizontal' ? 'row' : 'column'}`;

    const splitter = document.createElement('div');
    splitter.className = `splitter${direction === 'vertical' ? ' vertical' : ''}`;
    makeDraggable(splitter, direction);

    parent.insertBefore(wrapper, existingEl);
    wrapper.appendChild(existingEl);
    wrapper.appendChild(splitter);
    wrapper.appendChild(newPaneEl);

    // Update tab panes list
    const tab = state.tabs.find(t => t.id === state.activeTabId);
    if (tab) tab.panes.push(newPaneId);

    setTimeout(() => {
      mountTerm(newPaneId);
      // Re-fit existing pane after split
      if (pane.fitAddon) setTimeout(() => pane.fitAddon.fit(), 100);
      getWS();
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'connect', paneId: newPaneId, sessionId: pane.sessionId }));
        const timer = startLogFlush(newPaneId, pane.sessionId);
        state.panes[newPaneId].logTimer = timer;
      }, 150);
    }, 50);
  }

  function makeDraggable(splitter, direction) {
    splitter.addEventListener('mousedown', (e) => {
      e.preventDefault();
      splitter.classList.add('dragging');
      const isH = direction === 'horizontal';
      const parent = splitter.parentElement;
      const prev = splitter.previousElementSibling;
      const next = splitter.nextElementSibling;
      const startPos = isH ? e.clientX : e.clientY;
      const prevSize = isH ? prev.getBoundingClientRect().width : prev.getBoundingClientRect().height;
      const nextSize = isH ? next.getBoundingClientRect().width : next.getBoundingClientRect().height;
      const total = prevSize + nextSize;

      const onMove = (ev) => {
        const delta = (isH ? ev.clientX : ev.clientY) - startPos;
        const newPrev = Math.max(100, Math.min(total - 100, prevSize + delta));
        prev.style.flex = `0 0 ${newPrev}px`;
        next.style.flex = `0 0 ${total - newPrev}px`;
        // Refit terminals
        Object.keys(state.panes).forEach(pid => {
          const p = state.panes[pid];
          if (p && p.fitAddon) p.fitAddon.fit();
        });
      };
      const onUp = () => {
        splitter.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // ── Multi-exec ────────────────────────────────────────────────────
  function toggleMultiSelect(paneId, checked) {
    if (checked) state.selectedPanes.add(paneId);
    else state.selectedPanes.delete(paneId);
    const bar = document.getElementById('multi-exec-bar');
    if (state.selectedPanes.size > 0) {
      bar.classList.add('visible');
      document.getElementById('multi-exec-label').textContent = `${state.selectedPanes.size} server(s) selected`;
    } else {
      bar.classList.remove('visible');
    }
  }

  // ── Pane drag-to-swap ─────────────────────────────────────────────
  let _dragSourcePane = null;

  function paneDragStart(e, paneId) {
    _dragSourcePane = paneId;
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  }
  function paneDragOver(e, paneId) {
    if (!_dragSourcePane || _dragSourcePane === paneId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    document.getElementById('pane_el_' + paneId)?.classList.add('drag-over');
  }
  function paneDragLeave(e, paneId) {
    e.stopPropagation();
    document.getElementById('pane_el_' + paneId)?.classList.remove('drag-over');
  }
  function paneDrop(e, targetId) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('pane_el_' + targetId)?.classList.remove('drag-over');
    if (!_dragSourcePane || _dragSourcePane === targetId) { _dragSourcePane = null; return; }
    const srcId = _dragSourcePane;
    _dragSourcePane = null;

    const el1 = document.getElementById('pane_el_' + srcId);
    const el2 = document.getElementById('pane_el_' + targetId);
    if (!el1 || !el2) return;

    // Swap DOM positions
    const p1 = el1.parentElement, n1 = el1.nextSibling;
    const p2 = el2.parentElement, n2 = el2.nextSibling;
    p2.insertBefore(el1, n2);
    if (n1 === el2) { p1.insertBefore(el2, el1); }
    else             { p1.insertBefore(el2, n1); }

    // Refit both terminals
    setTimeout(() => {
      [srcId, targetId].forEach(id => { const p = state.panes[id]; if (p?.fitAddon) p.fitAddon.fit(); });
    }, 50);
  }

  // ── Select all / deselect all panes ──────────────────────────────
  function selectAllPanes() {
    Object.keys(state.panes).forEach(paneId => {
      const cb = document.querySelector(`#pane_el_${paneId} input[type=checkbox]`);
      if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    });
  }
  function deselectAllPanes() {
    Object.keys(state.panes).forEach(paneId => {
      const cb = document.querySelector(`#pane_el_${paneId} input[type=checkbox]`);
      if (cb && cb.checked) { cb.checked = false; cb.dispatchEvent(new Event('change')); }
    });
  }

  function sendMultiExec() {
    const cmd = document.getElementById('multi-exec-input').value.trim();
    if (!cmd || !state.selectedPanes.size) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'multi_exec', paneIds: [...state.selectedPanes], command: cmd }));
    }
    document.getElementById('multi-exec-input').value = '';
    App.notify(`Command sent to ${state.selectedPanes.size} server(s)`, 'success');
  }

  // ── Other ────────────────────────────────────────────────────────
  function closePane(paneId, skipConfirm = false) {
    if (!skipConfirm && !confirm('Close this panel?')) return;
    if (ws && ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ type: 'disconnect', paneId }));
    stopLogFlush(paneId);
    const pane = state.panes[paneId];
    if (pane) {
      if (pane.ro) pane.ro.disconnect();
      if (pane.term) pane.term.dispose();
    }
    delete state.panes[paneId];
    state.selectedPanes.delete(paneId);

    const el = document.getElementById('pane_el_' + paneId);
    if (el) {
      const parent = el.parentElement;
      el.remove();

      // If parent is a split wrapper (not pane-area itself), clean up
      const paneArea = document.getElementById('pane-area');
      if (parent && parent !== paneArea) {
        // Remove splitter dividers
        parent.querySelectorAll('.splitter').forEach(s => s.remove());

        const remaining = [...parent.children];
        if (remaining.length === 1) {
          // One sibling left — unwrap it up to grandparent
          const gp = parent.parentElement;
          remaining[0].style.flex = '1 1 0';
          gp.insertBefore(remaining[0], parent);
          parent.remove();
          // Re-fit that sibling's terminal
          setTimeout(() => {
            Object.values(state.panes).forEach(p => p?.fitAddon?.fit());
          }, 80);
        } else if (remaining.length === 0) {
          parent.remove();
        }
      }
    }

    // Update tab panes list
    for (const tab of state.tabs) {
      tab.panes = tab.panes.filter(id => id !== paneId);
    }

    // Show welcome screen if nothing left
    if (Object.keys(state.panes).length === 0) {
      const welcome = document.getElementById('welcome');
      if (welcome) welcome.style.display = 'flex';
    }

    // Update multi-exec bar
    if (state.selectedPanes.size === 0) {
      document.getElementById('multi-exec-bar').classList.remove('visible');
    } else {
      document.getElementById('multi-exec-label').textContent = `${state.selectedPanes.size} server(s) selected`;
    }

    App.updateStatusBar();
  }

  function disconnectPane(paneId) {
    if (ws && ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ type: 'disconnect', paneId }));
  }

  function pasteCommand(cmd) {
    const activePaneId = getActivePaneId();
    if (activePaneId && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', paneId: activePaneId, data: cmd }));
      // Focus the terminal so the user can immediately interact
      const pane = state.panes[activePaneId];
      if (pane && pane.term) pane.term.focus();
    }
  }

  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function init() {
    getWS();
    // Multi-exec enter
    document.getElementById('multi-exec-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMultiExec();
    });
    document.getElementById('btn-multi-exec').addEventListener('click', sendMultiExec);
  }

  return { init, connectNewPane, closePane, closeTab, switchTab, splitH, splitV, toggleMultiSelect, disconnectPane, pasteCommand, renderTabs, sendInput, addOutputListener, removeOutputListener, getActivePaneId, setFocusedPane, paneDragStart, paneDragOver, paneDragLeave, paneDrop, selectAllPanes, deselectAllPanes };
})();
