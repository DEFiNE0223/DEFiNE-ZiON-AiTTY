/**
 * ai-panel.js — AI 어시스턴트 패널
 *
 * 기능:
 *  - 다중 AI 모델 채팅 (Claude / GPT / Gemini / Groq)
 *  - 터미널 내용을 AI에게 컨텍스트로 전달
 *  - AI 응답의 코드 블록을 터미널에서 직접 실행
 *  - 🤖 실행+분석: 명령 실행 후 출력 자동 캡처 → AI에게 피드백
 *  - 에이전트 모드: AI가 명령 제안 → 자동실행+결과피드백 루프
 *  - 대화 히스토리 localStorage 저장
 *  - 사이드바: API Key 등록/삭제 UI
 */
window.AiPanel = (() => {
  /* ── 내부 상태 ────────────────────────────────────────────────────── */
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
2. When the user asks you to run a command (e.g. "ls 해줘", "check disk"), output ONLY the command inside a \`\`\`bash code block\`\`\`. Do NOT fabricate or guess the output.
3. The user's agent will execute the code block in their real SSH terminal and return the actual output to you.
4. After receiving real output, analyze it and suggest next steps if needed.
5. Never invent or assume command results. Always wait for real output.`,
    loading:         false,
    sysVisible:      true,
    agentMode:       false,      // 에이전트 모드: 코드블록 자동 실행+피드백
    agentRunning:    false,      // 에이전트 루프 실행 중
  };

  /* ── 초기화 ──────────────────────────────────────────────────────── */
  async function init() {
    // 구형 시스템 프롬프트(직접 실행 가정) 감지 시 새 프롬프트로 교체
    const stored = localStorage.getItem('ai_sys') || '';
    if (!stored || stored.includes('When suggesting commands') || !stored.includes('CANNOT execute')) {
      localStorage.removeItem('ai_sys');
      state.systemPrompt = state.systemPrompt; // 기본값 재적용
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

  /* ── 패널 열기/닫기 ─────────────────────────────────────────────── */
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

  /* ── 에이전트 모드 토글 ─────────────────────────────────────────── */
  function toggleAgent() {
    state.agentMode = !state.agentMode;
    const btn = document.getElementById('ai-agent-btn');
    if (btn) {
      btn.classList.toggle('active', state.agentMode);
      btn.title = state.agentMode ? '에이전트 모드 ON (자동 실행+분석)' : '에이전트 모드 OFF';
    }
    App.notify(state.agentMode ? '🤖 에이전트 모드 ON' : '에이전트 모드 OFF', 'info');
  }

  /* ── 프로바이더/모델 로딩 ────────────────────────────────────────── */
  async function loadProviders() {
    try {
      state.providers = await App.api('GET', '/ai/providers');
    } catch { /* 잠금 상태 등 */ }
  }

  function _renderProviderSelect() {
    const ps = document.getElementById('ai-provider-select');
    const ms = document.getElementById('ai-model-select');
    if (!ps) return;

    const registered = state.providers.filter(p => p.hasKey);
    ps.innerHTML = '<option value="">— 프로바이더 선택 —</option>' +
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

  /* ── 터미널 컨텍스트 전달 ────────────────────────────────────────── */
  function sendContext() {
    const paneId = state.activePaneId || Object.keys(App.state.panes)[0];
    if (!paneId) return App.notify('활성 터미널이 없습니다', 'error');

    const pane = App.state.panes[paneId];
    if (!pane?.term) return App.notify('터미널이 준비되지 않았습니다', 'error');

    const buf   = pane.term.buffer.active;
    const start = Math.max(0, buf.length - 150);
    const lines = [];
    for (let i = start; i < buf.length; i++) {
      const line = buf.getLine(i);
      if (line) lines.push(line.translateToString(true).trimEnd());
    }
    const ctx = lines.join('\n').trim();
    if (!ctx) return App.notify('터미널 내용이 비어있습니다', 'warning');

    const input = document.getElementById('ai-chat-input');
    input.value = `다음 터미널 출력을 분석해줘:\n\`\`\`\n${ctx}\n\`\`\``;
    input.focus();
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  }

  /* ── 명령 실행 후 출력 캡처 (핵심 에이전트 함수) ────────────────── */
  function runAndCapture(paneId, cmd, timeoutMs = 12000) {
    return new Promise((resolve) => {
      let raw   = '';
      let done  = false;
      let timer = null;

      // ANSI 이스케이프 제거 (CSI, OSC, DCS, 기타 모두 처리)
      const stripAnsi = s => s
        .replace(/\x1B\[[^A-Za-z]*[A-Za-z]/g, '')          // CSI: ESC[ ... letter  (?2004l 등 포함)
        .replace(/\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)/g, '') // OSC: ESC] ... BEL|ST
        .replace(/\x1B[PX^_][^\x1B]*\x1B\\/g, '')          // DCS/SOS/PM/APC
        .replace(/\x1B[^[\]PX^_]/g, '')                    // 기타 단순 ESC 시퀀스
        .replace(/\r/g, '');

      const settle = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        TermManager.removeOutputListener(onOutput);

        const lines = stripAnsi(raw).split('\n');
        const cleaned = lines
          .slice(1)   // 에코된 명령 줄 제거
          .filter((l, i, arr) => {
            if (i === arr.length - 1 && /[\$#>%]\s*$/.test(l)) return false; // 마지막 프롬프트 제거
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

        // 마지막 줄에 쉘 프롬프트 패턴 감지
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

  /* ── 코드 블록 추출 헬퍼 ─────────────────────────────────────────── */
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

  /* ── 코드 블록 터미널 실행 (단순) ───────────────────────────────── */
  function runCode(msgIdx, blockIdx = 0) {
    const msg = state.messages[msgIdx];
    if (!msg) return;

    const blocks = _extractCodeBlocks(msg.content);
    const cmd = blocks[blockIdx];
    if (!cmd) return App.notify('실행할 코드 블록이 없습니다', 'warning');

    const paneId = TermManager.getActivePaneId();
    if (!paneId) return App.notify('활성 터미널이 없습니다', 'error');

    TermManager.sendInput(paneId, cmd + '\n');
    App.notify('▶ 명령 실행됨', 'success');
  }

  /* ── 🤖 실행+분석: 실행 후 출력을 AI에게 자동 피드백 ────────────── */
  async function agentRun(msgIdx, blockIdx = 0) {
    if (state.agentRunning) return App.notify('에이전트가 이미 실행 중입니다', 'warning');

    const msg = state.messages[msgIdx];
    if (!msg) return;

    const blocks = _extractCodeBlocks(msg.content);
    const cmd = blocks[blockIdx];
    if (!cmd) return App.notify('실행할 코드 블록이 없습니다', 'warning');

    const paneId = TermManager.getActivePaneId();
    if (!paneId) return App.notify('활성 터미널이 없습니다', 'error');

    if (!state.currentProvider || !state.currentModel)
      return App.notify('AI 프로바이더를 먼저 선택하세요', 'warning');

    state.agentRunning = true;
    App.notify('🤖 명령 실행 중...', 'info');

    try {
      let output = await runAndCapture(paneId, cmd);

      // 출력이 너무 길면 앞부분 생략, 마지막 N줄만 유지
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
      const trimNote = trimmed ? `\n(출력이 길어 마지막 ${MAX_LINES}줄만 표시)` : '';

      App.notify('✅ 결과 캡처 완료 — AI 분석 중...', 'success');

      // 결과를 사용자 메시지로 추가
      const feedMsg = `명령 실행 결과:${trimNote}\n\`\`\`\n$ ${cmd}\n${output || '(출력 없음)'}\n\`\`\``;
      state.messages.push({ role: 'user', content: feedMsg, timestamp: Date.now() });
      _renderMessages();
      _saveHistory();

      // AI에게 자동 전송
      await _sendToAI();
    } catch (e) {
      App.notify('에이전트 오류: ' + e.message, 'error');
    } finally {
      state.agentRunning = false;
    }
  }

  /* ── AI 전송 (내부 공통 함수) ───────────────────────────────────── */
  async function _sendToAI() {
    if (state.loading) return;
    if (!state.currentProvider || !state.currentModel) return;

    state.loading = true;
    const sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '…'; }

    // 로딩 말풍선
    const loadEl = document.createElement('div');
    loadEl.className = 'ai-msg assistant';
    loadEl.id = 'ai-loading-bubble';
    loadEl.innerHTML = `
      <div class="ai-msg-meta"><span class="ai-model-badge">${state.currentModel}</span></div>
      <div class="ai-msg-content"><span class="ai-typing">●&nbsp;●&nbsp;●</span></div>`;
    const msgsEl = document.getElementById('ai-chat-messages');
    if (msgsEl) { msgsEl.appendChild(loadEl); _scrollBottom(); }

    try {
      // 각 메시지 내용이 너무 길면 앞부분 축약 후 전송
      const MSG_MAX = 4000;
      const trimMsg = m => ({
        role:    m.role,
        content: m.content.length > MSG_MAX
          ? m.content.slice(0, MSG_MAX) + '\n...(생략됨)'
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

      // 에이전트 모드: AI 응답에 코드 블록이 있으면 자동 실행
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
      App.notify('AI 오류: ' + e.message, 'error');
      throw e;
    } finally {
      state.loading = false;
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '전송'; }
    }
  }

  /* ── 메시지 전송 (사용자 입력) ──────────────────────────────────── */
  async function send() {
    if (state.loading) return;
    const input   = document.getElementById('ai-chat-input');
    const content = input.value.trim();
    if (!content) return;

    if (!state.currentProvider)
      return App.notify('프로바이더를 선택하세요 (API Key 등록 필요)', 'warning');
    if (!state.currentModel)
      return App.notify('모델을 선택하세요', 'warning');

    state.messages.push({ role: 'user', content, timestamp: Date.now() });
    input.value = '';
    input.style.height = 'auto';
    _renderMessages();

    await _sendToAI();
  }

  /* ── 대화 초기화 ─────────────────────────────────────────────────── */
  function clearHistory() {
    state.messages = [];
    localStorage.removeItem('ai_messages');
    _renderMessages();
    App.notify('대화 초기화됨', 'info');
  }

  /* ── 시스템 프롬프트 토글 ────────────────────────────────────────── */
  function toggleSys() {
    state.sysVisible = !state.sysVisible;
    document.getElementById('ai-sys-row').classList.toggle('visible', state.sysVisible);
  }

  function onSysChange() {
    state.systemPrompt = document.getElementById('ai-sys-prompt').value;
    localStorage.setItem('ai_sys', state.systemPrompt);
  }

  /* ── 메시지 렌더링 ───────────────────────────────────────────────── */
  function _renderMessages() {
    const el = document.getElementById('ai-chat-messages');
    if (!el) return;

    if (state.messages.length === 0) {
      el.innerHTML = `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--fg3);font-size:12px;padding:20px;text-align:center">
          <div style="font-size:32px">🤖</div>
          <div>AI 어시스턴트</div>
          <div style="font-size:11px">프로바이더를 선택하고 메시지를 입력하거나<br>📋 버튼으로 터미널 내용을 전달하세요</div>
          <div style="font-size:11px;margin-top:8px;color:var(--yellow)">🤖 버튼으로 에이전트 모드를 켜면<br>AI가 명령을 자동으로 실행·분석합니다</div>
        </div>`;
      return;
    }

    el.innerHTML = state.messages.map((m, i) => {
      const isUser = m.role === 'user';
      const time   = m.timestamp
        ? new Date(m.timestamp).toLocaleTimeString('ko', { hour: '2-digit', minute: '2-digit' })
        : '';
      const badge  = m.model
        ? `<span class="ai-model-badge">${m.model}</span>`
        : '';

      // 코드 블록 렌더링: 각 블록마다 ▶실행 + 🤖실행+분석 버튼
      let blockIdx = 0;
      const rendered = _escHtml(m.content)
        .replace(/```(?:\w*)\n?([\s\S]*?)```/g, (_, code) => {
          const bi  = blockIdx++;
          const trimmed = code.trim();
          // 코드 블록 내용은 이미 escape됨
          const btns = isUser ? '' : `
            <div class="ai-code-btns">
              <button class="ai-run-btn" onclick="AiPanel.runCode(${i},${bi})" data-tip="터미널에서 실행">▶ 실행</button>
              <button class="ai-run-btn agent" onclick="AiPanel.agentRun(${i},${bi})" data-tip="실행 후 결과를 AI에게 전달·분석">🤖 실행+분석</button>
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
            ${isUser ? '<span style="color:var(--blue)">나</span>' : badge}
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

  /* ── 히스토리 저장/불러오기 ─────────────────────────────────────── */
  function _saveHistory() {
    try { localStorage.setItem('ai_messages', JSON.stringify(state.messages.slice(-100))); }
    catch { /* 저장 공간 부족 */ }
  }

  function _loadHistory() {
    try {
      const raw = localStorage.getItem('ai_messages');
      if (raw) state.messages = JSON.parse(raw);
    } catch { state.messages = []; }
  }

  /* ── 사이드바: API Key 관리 렌더링 ─────────────────────────────── */
  async function _renderSidebarKeys() {
    const el = document.getElementById('ai-keys-list');
    if (!el) return;

    if (!App.state.unlocked) {
      el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--fg3);font-size:12px">잠금 해제 후 사용 가능</div>';
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
            ? `<button class="btn-sm danger" onclick="AiPanel.deleteKey('${p.id}')">삭제</button>`
            : `<button class="btn-sm primary" onclick="AiPanel.showKeyInput('${p.id}')">등록</button>`}
        </div>
      </div>
      <div id="ai-key-input-${p.id}" class="ai-key-input-row">
        <input type="password" id="ai-key-val-${p.id}"
               placeholder="${p.id} API Key..."
               autocomplete="new-password"
               onkeydown="if(event.key==='Enter')AiPanel.saveKey('${p.id}')">
        <button class="btn-sm primary" onclick="AiPanel.saveKey('${p.id}')">저장</button>
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
    if (!val) return App.notify('API Key를 입력하세요', 'warning');
    try {
      await App.api('POST', '/ai/keys', { provider: id, key: val });
      App.notify('✅ API Key 저장됨', 'success');
      hideKeyInput(id);
      await _renderSidebarKeys();
    } catch (e) {
      App.notify('저장 실패: ' + e.message, 'error');
    }
  }

  async function deleteKey(id) {
    const prov = state.providers.find(p => p.id === id);
    if (!confirm(`${prov?.label || id} API Key를 삭제하시겠습니까?`)) return;
    await App.api('DELETE', `/ai/keys/${id}`);
    App.notify('삭제됨', 'info');
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
