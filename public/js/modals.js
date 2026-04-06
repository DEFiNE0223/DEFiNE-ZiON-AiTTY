/**
 * modals.js — New Session, Edit Session, New Snippet dialogs
 */
window.Modals = (() => {
  const state = App.state;

  // ── New / Edit Session ────────────────────────────────────────────
  function showNewSession() {
    showSessionModal(null);
  }

  function showEditSession(session) {
    showSessionModal(session);
  }

  function showSessionModal(session) {
    const isEdit = !!session;
    const m = document.getElementById('modal-session');
    m.querySelector('h2').textContent = isEdit ? '세션 편집' : '새 세션';

    // Populate preset grid
    let presetHtml = '';
    for (const p of state.presets) {
      presetHtml += `<div class="preset-card ${session?.osType === p.id ? 'selected' : ''}"
        data-preset="${p.id}" onclick="Modals.selectPreset('${p.id}')">
        <div class="p-icon">${p.icon}</div>
        <div class="p-name">${p.name}</div>
      </div>`;
    }
    document.getElementById('preset-grid').innerHTML = presetHtml;
    document.getElementById('sel-preset').value = session?.osType || 'ubuntu';

    // Fill fields
    document.getElementById('inp-sname').value    = session?.name     || '';
    document.getElementById('inp-sgroup').value   = session?.group    || 'Default';
    document.getElementById('inp-shost').value    = session?.host     || '';
    document.getElementById('inp-sport').value    = session?.port     || 22;
    document.getElementById('inp-suser').value    = session?.username || '';
    document.getElementById('inp-spass').value    = '';
    document.getElementById('inp-snotes').value   = session?.notes    || '';
    document.getElementById('inp-stags').value    = (session?.tags || []).join(', ');

    document.getElementById('btn-save-session').onclick = () => saveSession(session?.id);
    showModal('modal-session');
  }

  function selectPreset(id) {
    document.querySelectorAll('.preset-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.preset === id);
    });
    document.getElementById('sel-preset').value = id;
  }

  async function saveSession(editId) {
    const name     = document.getElementById('inp-sname').value.trim();
    const group    = document.getElementById('inp-sgroup').value.trim() || 'Default';
    const host     = document.getElementById('inp-shost').value.trim();
    const port     = parseInt(document.getElementById('inp-sport').value) || 22;
    const username = document.getElementById('inp-suser').value.trim();
    const password = document.getElementById('inp-spass').value;
    const osType   = document.getElementById('sel-preset').value || 'ubuntu';
    const notes    = document.getElementById('inp-snotes').value.trim();
    const tags     = document.getElementById('inp-stags').value.split(',').map(t => t.trim()).filter(Boolean);

    if (!name || !host || !username) {
      App.notify('이름, 호스트, 사용자명은 필수입니다', 'error');
      return;
    }

    const body = { name, group, host, port, username, osType, notes, tags };
    if (password) body.password = password;

    try {
      if (editId) {
        await App.api('PUT', '/sessions/' + editId, body);
        App.notify('세션 수정됨', 'success');
      } else {
        await App.api('POST', '/sessions', body);
        App.notify('세션 추가됨', 'success');
      }
      hideModal('modal-session');
      await App.loadAll();
    } catch (e) { App.notify(e.message, 'error'); }
  }

  // ── New Snippet ───────────────────────────────────────────────────
  function showNewSnippet() {
    document.getElementById('inp-snname').value = '';
    document.getElementById('inp-sncmd').value  = '';
    document.getElementById('inp-sndesc').value = '';
    document.getElementById('btn-save-snippet').onclick = saveSnippet;
    showModal('modal-snippet');
  }

  async function saveSnippet() {
    const name    = document.getElementById('inp-snname').value.trim();
    const command = document.getElementById('inp-sncmd').value.trim();
    const desc    = document.getElementById('inp-sndesc').value.trim();
    if (!name || !command) { App.notify('이름과 명령어는 필수입니다', 'error'); return; }
    try {
      await App.api('POST', '/snippets', { name, command, description: desc });
      App.notify('스니펫 추가됨', 'success');
      hideModal('modal-snippet');
      await App.loadAll();
    } catch (e) { App.notify(e.message, 'error'); }
  }

  // ── Generic helpers ───────────────────────────────────────────────
  function showModal(id) {
    document.getElementById(id).classList.remove('hidden');
  }
  function hideModal(id) {
    document.getElementById(id).classList.add('hidden');
  }

  // Close on backdrop click
  document.querySelectorAll && document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      e.target.classList.add('hidden');
    }
  });

  return { showNewSession, showEditSession, showSessionModal, selectPreset, saveSession, showNewSnippet, saveSnippet, hideModal };
})();
