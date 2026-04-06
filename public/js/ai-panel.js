/**
 * ai-panel.js — AI Assistant Panel
 *
 * Features:
 *  - Multi-model AI chat (Claude / GPT / Gemini / Groq)
 *  - Send terminal content as context to AI
 *  - Run code blocks from AI responses directly in terminal
 *  - 🤖 Run+Analyze: auto-capture output after command → feedback to AI
 *  - Agent mode: AI suggests commands → auto-run + result feedback loop
 *  - Conversation history saved to localStorage
 *  - Sidebar: API Key register/delete UI
 */
window.AiPanel = (() => {
  /* ── Internal state ──────────────────────────────────────────────── */
  const state = {
    open:            false,
    activePaneId:    null,
    messages:        [],
    providers:       [],
    currentProvider: localStorage.getItem('ai_provider') || '',
    currentModel:    localStorage.getItem('ai_model')    || '',
    systemPrompt:    localStorage.getItem('ai_sys')      ||
      `You are a Linux/DevOps assistant connected to a remote SSH terminal.
IMPORTANT RULES:
1. You CANNOT execute commands yourself. You have NO access to any shell or filesystem.
2. When the user asks you to run a command (e.g. "ls", "check disk"), output ONLY the command inside a \`\`\`bash code block\`\`\`. Do NOT fabricate or guess the output.
3. The user's agent will execute the code block in their real SSH terminal and return the actual output to you.
4. After receiving real output, analyze it and suggest next steps if needed.
5. Never invent or assume command results. Always wait for real output.`,
    loading:         false,
    sysVisible:      true,
    agentMode:       false,      // Agent mode: auto-execute code blocks + feedback
    agentRunning:    false,      // Agent loop currently running
  };

  /* ── Initialization ──────────────────────────────────────────────── */
  async function init() {
    // Detect old system prompt (assumed direct execution) and replace with new one
    const stored = localStorage.getItem('ai_sys') || '';
    if (!stored || stored.includes('When suggesting commands') || !stored.includes('CANNOT execute')) {
      localStorage.removeItem('ai_sys');
      state.systemPrompt = state.systemPrompt; // Re-apply default value
    }

    _loadHistory();
    document.getElementById('ai-sys-prompt').value = state.systemPrompt;

    document.getElementById('ai-chat-input').addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        send();
      }
    });

    await loadProviders();
    _renderProviderSelect();
    _renderMessages();
  }

  /* ── Panel open/close ───────────────────────────────────────────── */
  function open(paneId) {
    state.activePaneId = paneId;
    state.open = true;
    document.getElementById('ai-chat-panel').classList.add('open');
    loadProviders().then(() => {
      _renderProviderSelect();
      _renderSidebarKeys();
    });
  }

  function close() {
    state.open = false;
    document.getElementById('ai-chat-panel').classList.remove('open');
  }

  function toggle(paneId) {
    if (state.open && state.activePaneId === paneId) close();
    else open(paneId);
  }

  /* ── Agent mode toggle ──────────────────────────────────────────── */
  function toggleAgent() {
    state.agentMode = !state.agentMode;
    const btn = document.getElementById('ai-agent-btn');
    if (btn) {
      btn.classList.toggle('active', state.agentMode);
      btn.title = state.agentMode ? 'Agent mode ON (auto run+analyze)' : 'Agent mode OFF';
    }
    App.notify(state.agentMode ? '🤖 Agent mode ON' : 'Agent mode OFF', 'info');
  }

  /* ── Provider/model loading ─────────────────────────────────────── */
  async function loadProviders() {
    try {
      state.providers = await App.api('GET', '/ai/providers');
    } catch { /* locked state, etc. */ }
  }

  function _renderProviderSelect() {
    const ps = document.getElementById('ai-provider-select');
    const ms = document.getElementById('ai-model-select');
    if (!ps) return;

    const registered = state.providers.filter(p => p.hasKey);
    ps.innerHTML = '<option value="">— Select Provider —</option>' +
      registered.map(p =>
        `<option value="${p.id}" ${p.id === state.currentProvider ? 'selected' : ''}>${p.icon} ${p.label}</option>`
      ).join('');

    if (state.currentProvider) _updateModelSelect();
  }

  function _updateModelSelect() {
    const ms = document.getElementById('ai-model-select');
    if (!ms) return;
    const prov = state.providers.find(p => p.id === state.currentProvider);
    if (!prov) { ms.innerHTML = ''; return; }
    ms.innerHTML = prov.models.map(m =>
      `<option value="${m}" ${m === state.currentModel ? 'selected' : ''}>${m}</option>`
    ).join('');
    if (!state.currentModel || !prov.models.includes(state.currentModel)) {
      state.currentModel = prov.models[0] || '';
      ms.value = state.currentModel;
    }
  }

  function onProviderChange() {
    state.currentProvider = document.getElementById('ai-provider-select').value;
    localStorage.setItem('ai_provider', state.currentProvider);
    _updateModelSelect();
  }

  function onModelChange() {
    state.currentModel = document.getElementById('ai-model-select').value;
    localStorage.setItem('ai_model', state.currentModel);
  }

  /* ── Send terminal context ──────────────────────────────────────── */
  function sendContext() {
    const paneId = state.activePaneId || Object.keys(App.state.panes)[0];
    if (!paneId) return App.notify('No active terminal', 'error');

    const pane = App.state.panes[paneId];
    if (!pane?.term) return App.notify('Terminal is not ready', 'error');

    const buf   = pane.term.buffer.active;
    const start = Math.max(0, buf.length - 150);
    const lines = [];
    for (let i = start; i < buf.length; i++) {
      const line = buf.getLine(i);
      if (line) lines.push(line.translateToString(true).trimEnd());
    }
    const ctx = lines.join('\n').trim();
    if (!ctx) return App.notify('Terminal content is empty', 'warning');

    const input = document.getElementById('ai-chat-input');
    input.value = `Please analyze the following terminal output:\n\`\`\`\n${ctx}\n\`\`\``;
    input.focus();
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  }

  /* ── Run command and capture output (core agent function) ────────── */
  function runAndCapture(paneId, cmd, timeoutMs = 12000) {
    return new Promise((resolve) => {
      let raw   = '';
      let done  = false;
      let timer = null;

      // Strip ANSI escape codes (CSI, OSC, DCS, and others)
      const stripAnsi = s => s
        .replace(/\x1B\[[^A-Za-z]*[A-Za-z]/g, '')          // CSI: ESC[ ... letter  (incl. ?2004l etc.)
        .replace(/\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)/g, '') // OSC: ESC] ... BEL|ST
        .replace(/\x1B[PX^_][^\x1B]*\x1B\\/g, '')          // DCS/SOS/PM/APC
        .replace(/\x1B[^[\]PX^_]/g, '')                    // Other simple ESC sequences
        .replace(/\r/g, '');

      const settle = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        TermManager.removeOutputListener(onOutput);

        const lines = stripAnsi(raw).split('\n');
        const cleaned = lines
          .slice(1)   // Remove echoed command line
          .filter((l, i, arr) => {
            if (i === arr.length - 1 && /[\$#>%]\s*$/.test(l)) return false; // Remove final prompt
            return true;
          })
          .join('\n')
          .trim();

        resolve(cleaned || stripAnsi(raw).trim());
      };

      const onOutput = (pid, data) => {
        if (pid !== paneId) return;
        raw += data;
        clearTimeout(timer);

        // Detect shell prompt pattern on last line
        const lastLine = stripAnsi(raw).split('\n').pop() || '';
        if (/[\$#>%]\s*$/.test(lastLine)) {
          timer = setTimeout(settle, 350);
        } else {
          timer = setTimeout(settle, 4000);
        }
      };

      TermManager.addOutputListener(onOutput);
      TermManager.sendInput(paneId, cmd + '\n');
      setTimeout(settle, timeoutMs);
    });
  }

  /* ── Code block extraction helper ──────────────────────────────── */
  function _extractCodeBlocks(content) {
    const blocks = [];
    const re = /```(?:\w*)\n?([\s\S]*?)```/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      const code = m[1].trim();
      if (code) blocks.push(code);
    }
    return blocks;
  }

  /* ── Run code block in terminal (simple) ────────────────────────── */
  function runCode(msgIdx, blockIdx = 0) {
    const msg = state.messages[msgIdx];
    if (!msg) return;

    const blocks = _extractCodeBlocks(msg.content);
    const cmd = blocks[blockIdx];
    if (!cmd) return App.notify('No code block to run', 'warning');

    const paneId = TermManager.getActivePaneId();
    if (!paneId) return App.notify('No active terminal', 'error');

    TermManager.sendInput(paneId, cmd + '\n');
    App.notify('▶ Command executed', 'success');
  }

  /* ── 🤖 Run+Analyze: auto-feed output to AI after execution ──────── */
  async function agentRun(msgIdx, blockIdx = 0) {
    if (state.agentRunning) return App.notify('Agent is already running', 'warning');

    const msg = state.messages[msgIdx];
    if (!msg) return;

    const blocks = _extractCodeBlocks(msg.content);
    const cmd = blocks[blockIdx];
    if (!cmd) return App.notify('No code block to run', 'warning');

    const paneId = TermManager.getActivePaneId();
    if (!paneId) return App.notify('No active terminal', 'error');

    if (!state.currentProvider || !state.currentModel)
      return App.notify('Please select an AI provider first', 'warning');

    state.agentRunning = true;
    App.notify('🤖 Running command...', 'info');

    try {
      let output = await runAndCapture(paneId, cmd);

      // If output is too long, trim to last N lines
      const MAX_LINES = 120;
      const MAX_CHARS = 6000;
      const lines = output.split('\n');
      let trimmed = false;
      if (lines.length > MAX_LINES) {
        output = lines.slice(-MAX_LINES).join('\n');
        trimmed = true;
      }
      if (output.length > MAX_CHARS) {
        output = output.slice(-MAX_CHARS);
        trimmed = true;
      }
      const trimNote = trimmed ? `\n(Output truncated — showing last ${MAX_LINES} lines)` : '';

      App.notify('✅ Result captured — analyzing with AI...', 'success');

      // Add result as user message
      const feedMsg = `Command output:${trimNote}\n\`\`\`\n$ ${cmd}\n${output || '(no output)'}\n\`\`\``;
      state.messages.push({ role: 'user', content: feedMsg, timestamp: Date.now() });
      _renderMessages();
      _saveHistory();

      // Auto-send to AI
      await _sendToAI();
    } catch (e) {
      App.notify('Agent error: ' + e.message, 'error');
    } finally {
      state.agentRunning = false;
    }
  }

  /* ── Send to AI (internal shared function) ──────────────────────── */
  async function _sendToAI() {
    if (state.loading) return;
    if (!state.currentProvider || !state.currentModel) return;

    state.loading = true;
    const sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '…'; }

    // Loading bubble
    const loadEl = document.createElement('div');
    loadEl.className = 'ai-msg assistant';
    loadEl.id = 'ai-loading-bubble';
    loadEl.innerHTML = `
      <div class="ai-msg-meta"><span class="ai-model-badge">${state.currentModel}</span></div>
      <div class="ai-msg-content"><span class="ai-typing">●&nbsp;●&nbsp;●</span></div>`;
    const msgsEl = document.getElementById('ai-chat-messages');
    if (msgsEl) { msgsEl.appendChild(loadEl); _scrollBottom(); }

    try {
      // Truncate message content if too long before sending
      const MSG_MAX = 4000;
      const trimMsg = m => ({
        role:    m.role,
        content: m.content.length > MSG_MAX
          ? m.content.slice(0, MSG_MAX) + '\n...(truncated)'
          : m.content,
      });
      const res = await App.api('POST', '/ai/chat', {
        provider:     state.currentProvider,
        model:        state.currentModel,
        messages:     state.messages.slice(-20).map(trimMsg),
        systemPrompt: state.systemPrompt || null,
      });

      document.getElementById('ai-loading-bubble')?.remove();
      const aiMsg = {
        role:      'assistant',
        content:   res.content,
        provider:  state.currentProvider,
        model:     state.currentModel,
        timestamp: Date.now(),
      };
      state.messages.push(aiMsg);
      _renderMessages();
      _saveHistory();

      // Agent mode: auto-run if AI response contains code blocks
      if (state.agentMode && !state.agentRunning) {
        const blocks = _extractCodeBlocks(res.content);
        if (blocks.length > 0) {
          const lastIdx = state.messages.length - 1;
          setTimeout(() => agentRun(lastIdx, 0), 600);
        }
      }

      return aiMsg;
    } catch (e) {
      document.getElementById('ai-loading-bubble')?.remove();
      _renderMessages();
      App.notify('AI error: ' + e.message, 'error');
      throw e;
    } finally {
      state.loading = false;
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send'; }
    }
  }

  /* ── Send message (user input) ──────────────────────────────────── */
  async function send() {
    if (state.loading) return;
    const input   = document.getElementById('ai-chat-input');
    const content = input.value.trim();
    if (!content) return;

    if (!state.currentProvider)
      return App.notify('Please select a provider (API Key required)', 'warning');
    if (!state.currentModel)
      return App.notify('Please select a model', 'warning');

    state.messages.push({ role: 'user', content, timestamp: Date.now() });
    input.value = '';
    input.style.height = 'auto';
    _renderMessages();

    await _sendToAI();
  }

  /* ── Clear conversation ─────────────────────────────────────────── */
  function clearHistory() {
    state.messages = [];
    localStorage.removeItem('ai_messages');
    _renderMessages();
    App.notify('Conversation cleared', 'info');
  }

  /* ── System prompt toggle ───────────────────────────────────────── */
  function toggleSys() {
    state.sysVisible = !state.sysVisible;
    document.getElementById('ai-sys-row').classList.toggle('visible', state.sysVisible);
  }

  function onSysChange() {
    state.systemPrompt = document.getElementById('ai-sys-prompt').value;
    localStorage.setItem('ai_sys', state.systemPrompt);
  }

  /* ── Message rendering ──────────────────────────────────────────── */
  function _renderMessages() {
    const el = document.getElementById('ai-chat-messages');
    if (!el) return;

    if (state.messages.length === 0) {
      el.innerHTML = `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--fg3);font-size:12px;padding:20px;text-align:center">
          <div style="font-size:32px">🤖</div>
          <div>AI Assistant</div>
          <div style="font-size:11px">Select a provider and type a message, or<br>use 📋 to send terminal content</div>
          <div style="font-size:11px;margin-top:8px;color:var(--yellow)">Enable agent mode with 🤖 to let<br>AI auto-run and analyze commands</div>
        </div>`;
      return;
    }

    el.innerHTML = state.messages.map((m, i) => {
      const isUser = m.role === 'user';
      const time   = m.timestamp
        ? new Date(m.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
        : '';
      const badge  = m.model
        ? `<span class="ai-model-badge">${m.model}</span>`
        : '';

      // Render code blocks: each with ▶Run + 🤖Run+Analyze buttons
      let blockIdx = 0;
      const rendered = _escHtml(m.content)
        .replace(/```(?:\w*)\n?([\s\S]*?)```/g, (_, code) => {
          const bi  = blockIdx++;
          const trimmed = code.trim();
          // Code block content is already escaped
          const btns = isUser ? '' : `
            <div class="ai-code-btns">
              <button class="ai-run-btn" onclick="AiPanel.runCode(${i},${bi})" data-tip="Run in terminal">▶ Run</button>
              <button class="ai-run-btn agent" onclick="AiPanel.agentRun(${i},${bi})" data-tip="Run and send result to AI for analysis">🤖 Run+Analyze</button>
            </div>`;
          return `
            <div class="ai-code-block">
              <pre><code>${trimmed}</code></pre>
              ${btns}
            </div>`;
        })
        .replace(/`([^`\n]+)`/g, '<code class="ai-inline-code">$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

      return `
        <div class="ai-msg ${m.role}">
          <div class="ai-msg-meta">
            ${isUser ? '<span style="color:var(--blue)">You</span>' : badge}
            <span class="ai-msg-time">${time}</span>
          </div>
          <div class="ai-msg-content">${rendered}</div>
        </div>`;
    }).join('');

    _scrollBottom();
  }

  function _escHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function _scrollBottom() {
    const el = document.getElementById('ai-chat-messages');
    if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 40);
  }

  /* ── Save/load history ──────────────────────────────────────────── */
  function _saveHistory() {
    try { localStorage.setItem('ai_messages', JSON.stringify(state.messages.slice(-100))); }
    catch { /* storage quota exceeded */ }
  }

  function _loadHistory() {
    try {
      const raw = localStorage.getItem('ai_messages');
      if (raw) state.messages = JSON.parse(raw);
    } catch { state.messages = []; }
  }

  /* ── Sidebar: API Key management rendering ──────────────────────── */
  async function _renderSidebarKeys() {
    const el = document.getElementById('ai-keys-list');
    if (!el) return;

    if (!App.state.unlocked) {
      el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--fg3);font-size:12px">Available after unlock</div>';
      return;
    }

    await loadProviders();
    _renderProviderSelect();

    el.innerHTML = state.providers.map(p => `
      <div class="ai-provider-item">
        <span class="ai-provider-icon">${p.icon}</span>
        <div class="ai-provider-info">
          <span class="ai-provider-dot ${p.hasKey ? 'active' : ''}"></span>
          <span class="ai-provider-label">${p.label}</span>
        </div>
        <div class="ai-provider-actions">
          ${p.hasKey
            ? `<button class="btn-sm danger" onclick="AiPanel.deleteKey('${p.id}')">Delete</button>`
            : `<button class="btn-sm primary" onclick="AiPanel.showKeyInput('${p.id}')">Register</button>`}
        </div>
      </div>
      <div id="ai-key-input-${p.id}" class="ai-key-input-row">
        <input type="password" id="ai-key-val-${p.id}"
               placeholder="${p.id} API Key..."
               autocomplete="new-password"
               onkeydown="if(event.key==='Enter')AiPanel.saveKey('${p.id}')">
        <button class="btn-sm primary" onclick="AiPanel.saveKey('${p.id}')">Save</button>
        <button class="btn-sm" onclick="AiPanel.hideKeyInput('${p.id}')">✕</button>
      </div>
    `).join('');
  }

  function showKeyInput(id) {
    document.getElementById(`ai-key-input-${id}`).style.display = 'flex';
    document.getElementById(`ai-key-val-${id}`)?.focus();
  }

  function hideKeyInput(id) {
    const row = document.getElementById(`ai-key-input-${id}`);
    if (row) row.style.display = 'none';
    const inp = document.getElementById(`ai-key-val-${id}`);
    if (inp) inp.value = '';
  }

  async function saveKey(id) {
    const inp = document.getElementById(`ai-key-val-${id}`);
    const val = inp?.value.trim();
    if (!val) return App.notify('Please enter an API Key', 'warning');
    try {
      await App.api('POST', '/ai/keys', { provider: id, key: val });
      App.notify('✅ API Key saved', 'success');
      hideKeyInput(id);
      await _renderSidebarKeys();
    } catch (e) {
      App.notify('Save failed: ' + e.message, 'error');
    }
  }

  async function deleteKey(id) {
    const prov = state.providers.find(p => p.id === id);
    if (!confirm(`Delete ${prov?.label || id} API Key?`)) return;
    await App.api('DELETE', `/ai/keys/${id}`);
    App.notify('Deleted', 'info');
    await _renderSidebarKeys();
    if (state.currentProvider === id) {
      state.currentProvider = '';
      state.currentModel    = '';
      _renderProviderSelect();
    }
  }

  async function onTabEnter() {
    await _renderSidebarKeys();
  }

  /* ── Public API ─────────────────────────────────────────────────── */
  return {
    init,
    open, close, toggle,
    send, sendContext,
    runCode, agentRun,
    toggleAgent,
    clearHistory,
    toggleSys, onSysChange,
    onProviderChange, onModelChange,
    showKeyInput, hideKeyInput, saveKey, deleteKey,
    onTabEnter,
  };
})();
