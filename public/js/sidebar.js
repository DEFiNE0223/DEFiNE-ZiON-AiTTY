/**
 * sidebar.js — Session tree, SFTP browser, Snippets panel
 */
window.Sidebar = (() => {
  const state = App.state;
  let sftpSessionId = null;
  let sftpPath = '/';

  // ── Tab switching ─────────────────────────────────────────────────
  function initTabs() {
    document.querySelectorAll('.stab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.stab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const panel = tab.dataset.panel;
        document.querySelectorAll('#sessions-panel,#sftp-panel,#snippets-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(panel + '-panel').classList.add('active');
      });
    });
  }

  // ── Session Tree ─────────────────────────────────────────────────
  function renderSessions() {
    const container = document.getElementById('sessions-panel');
    const sessions  = state.sessions;

    // Group sessions
    const groups = {};
    sessions.forEach(s => {
      if (!groups[s.group]) groups[s.group] = [];
      groups[s.group].push(s);
    });

    let html = `<div class="panel-toolbar">
      <button class="btn-sm primary" onclick="Modals.showNewSession()">＋ New Session</button>
      <button class="btn-sm" onclick="Sidebar.refreshSessions()">↻</button>
    </div>`;

    if (sessions.length === 0) {
      html += `<div style="padding:20px;text-align:center;color:var(--fg3);font-size:12px">
        No sessions<br><br>Click ＋ New Session to add one
      </div>`;
    }

    for (const group in groups) {
      const gid = 'g_' + btoa(group).replace(/=/g,'');
      html += `<div class="group-header" onclick="Sidebar.toggleGroup('${gid}')">
        <span class="caret">▼</span>
        <span>${group}</span>
        <span class="badge">${groups[group].length}</span>
      </div>
      <div id="${gid}">`;
      for (const s of groups[group]) {
        const preset = state.presets.find(p => p.id === s.osType) || {};
        const icon = preset.icon || '💻';
        html += `<div class="session-item" id="si_${s.id}"
          draggable="true"
          onclick="Sidebar.connectSession('${s.id}')"
          ondragstart="Sidebar.dragStart(event,'${s.id}')"
          ondragover="Sidebar.dragOver(event)"
          ondragleave="Sidebar.dragLeave(event)"
          ondrop="Sidebar.dropSession(event,'${s.id}')">
          <span class="os-icon">${icon}</span>
          <div style="flex:1;overflow:hidden">
            <div class="s-name">${esc(s.name)}</div>
            <div class="s-host">${esc(s.username)}@${esc(s.host)}:${s.port}</div>
          </div>
          <div class="s-actions">
            <button class="s-action-btn" data-tip="SFTP Browser" onclick="Sidebar.openSftp(event,'${s.id}')">📁</button>
            <button class="s-action-btn" data-tip="Edit" onclick="Sidebar.editSession(event,'${s.id}')">✏️</button>
            <button class="s-action-btn" data-tip="Delete" onclick="Sidebar.deleteSession(event,'${s.id}')">🗑️</button>
          </div>
        </div>`;
      }
      html += '</div>';
    }

    container.innerHTML = html;
  }

  // ── SFTP browser ──────────────────────────────────────────────────
  function openSftp(e, sessionId) {
    e.stopPropagation();
    sftpSessionId = sessionId;
    sftpPath = '/';
    document.querySelectorAll('.stab').forEach(t => t.classList.remove('active'));
    document.querySelector('.stab[data-panel="sftp"]').classList.add('active');
    document.querySelectorAll('#sessions-panel,#sftp-panel,#snippets-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('sftp-panel').classList.add('active');
    loadSftp('/');
  }

  async function loadSftp(path) {
    if (!sftpSessionId) return;
    sftpPath = path;
    document.getElementById('sftp-path-input').value = path;
    const fileList = document.getElementById('sftp-file-list');
    fileList.innerHTML = '<div style="padding:10px;color:var(--fg3);font-size:11px">Loading...</div>';
    try {
      const files = await App.api('GET', `/sftp/${sftpSessionId}/list?path=${encodeURIComponent(path)}`);
      renderFileList(files, path);
    } catch (e) {
      fileList.innerHTML = `<div style="padding:10px;color:var(--red);font-size:11px">Error: ${e.message}</div>`;
    }
  }

  function renderFileList(files, path) {
    const list = document.getElementById('sftp-file-list');
    let html = '';
    if (path !== '/') {
      html += `<div class="sftp-item" onclick="Sidebar.sftpNavigate('..')">
        <span class="fi-icon">📂</span><span class="fi-name">..</span>
      </div>`;
    }
    for (const f of files) {
      const icon = f.isDir ? '📁' : getFileIcon(f.name);
      const size = f.isDir ? '' : formatSize(f.size);
      html += `<div class="sftp-item" onclick="Sidebar.sftpClick('${esc(f.name)}',${f.isDir})">
        <span class="fi-icon">${icon}</span>
        <div style="flex:1;overflow:hidden">
          <div class="fi-name">${esc(f.name)}</div>
        </div>
        <span class="fi-size">${size}</span>
        <div class="fi-actions">
          ${!f.isDir ? `<button class="s-action-btn" title="Download" onclick="Sidebar.sftpDownload(event,'${esc(f.name)}')">⬇️</button>` : ''}
          <button class="s-action-btn" title="Delete" onclick="Sidebar.sftpDelete(event,'${esc(f.name)}',${f.isDir})">🗑️</button>
        </div>
      </div>`;
    }
    html += `<div class="sftp-dropzone" id="sftp-drop" ondragover="Sidebar.dragOver(event)" ondragleave="Sidebar.dragLeave(event)" ondrop="Sidebar.dropFiles(event)">
      📤 Drag files here to upload
    </div>`;
    list.innerHTML = html;
  }

  function sftpNavigate(name) {
    let newPath;
    if (name === '..') {
      const parts = sftpPath.replace(/\/$/, '').split('/');
      parts.pop();
      newPath = parts.join('/') || '/';
    } else {
      newPath = (sftpPath === '/' ? '' : sftpPath) + '/' + name;
    }
    loadSftp(newPath);
  }

  function sftpClick(name, isDir) {
    if (isDir) sftpNavigate(name);
  }

  function sftpDownload(e, name) {
    e.stopPropagation();
    const path = (sftpPath === '/' ? '' : sftpPath) + '/' + name;
    window.open(`/api/sftp/${sftpSessionId}/download?path=${encodeURIComponent(path)}`);
  }

  async function sftpDelete(e, name, isDir) {
    e.stopPropagation();
    if (!confirm(`Delete "${name}"?`)) return;
    const path = (sftpPath === '/' ? '' : sftpPath) + '/' + name;
    try {
      await App.api('DELETE', `/sftp/${sftpSessionId}/delete?path=${encodeURIComponent(path)}`);
      App.notify('Deleted', 'success');
      loadSftp(sftpPath);
    } catch (e) { App.notify('Delete failed: ' + e.message, 'error'); }
  }

  function dragOver(e) {
    e.preventDefault();
    document.getElementById('sftp-drop').classList.add('drag-over');
  }
  function dragLeave(e) {
    document.getElementById('sftp-drop').classList.remove('drag-over');
  }
  async function dropFiles(e) {
    e.preventDefault();
    document.getElementById('sftp-drop').classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    App.notify(`Uploading ${files.length} file(s)...`, 'info');
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    try {
      await fetch(`/api/sftp/${sftpSessionId}/upload?path=${encodeURIComponent(sftpPath)}`, { method: 'POST', body: fd });
      App.notify('Upload complete!', 'success');
      loadSftp(sftpPath);
    } catch (e) { App.notify('Upload failed: ' + e.message, 'error'); }
  }

  // ── Snippets ──────────────────────────────────────────────────────
  function renderSnippets() {
    const container = document.getElementById('snippets-panel');
    let html = `<div class="panel-toolbar">
      <button class="btn-sm primary" onclick="Modals.showNewSnippet()">＋ Add</button>
    </div>`;
    for (const s of state.snippets) {
      html += `<div class="snippet-item" onclick="TermManager.pasteCommand('${esc(s.command)}')">
        <div class="sn-name">${esc(s.name)}</div>
        <div class="sn-cmd">${esc(s.command)}</div>
        ${s.description ? `<div class="sn-desc">${esc(s.description)}</div>` : ''}
      </div>`;
    }
    if (!state.snippets.length) {
      html += '<div style="padding:20px;text-align:center;color:var(--fg3);font-size:12px">No snippets</div>';
    }
    container.innerHTML = html;
  }

  // ── Drag & Drop session reorder ───────────────────────────────────
  let draggedId = null;

  function dragStart(e, sessionId) {
    draggedId = sessionId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sessionId);
  }

  function dragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
  }

  function dragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  async function dropSession(e, targetId) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    if (!draggedId || draggedId === targetId) return;

    const sessions = [...state.sessions];
    const fromIdx  = sessions.findIndex(s => s.id === draggedId);
    const toIdx    = sessions.findIndex(s => s.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    // Reorder in memory + persist
    const [moved] = sessions.splice(fromIdx, 1);
    sessions.splice(toIdx, 0, moved);
    state.sessions = sessions;

    // Persist order via API (update each session's order)
    try {
      const { readSessions, writeSessions } = await (async () => {
        // Just call the reorder endpoint
        const ids = sessions.map(s => s.id);
        await App.api('POST', '/sessions/reorder', { ids });
      })();
    } catch {}

    renderSessions();
    draggedId = null;
  }

  // ── Actions ───────────────────────────────────────────────────────
  function connectSession(sessionId) {
    TermManager.connectNewPane(sessionId);
  }

  async function editSession(e, sessionId) {
    e.stopPropagation();
    const s = state.sessions.find(s => s.id === sessionId);
    if (s) Modals.showEditSession(s);
  }

  async function deleteSession(e, sessionId) {
    e.stopPropagation();
    if (!confirm('Delete this session?')) return;
    try {
      await App.api('DELETE', `/sessions/${sessionId}`);
      App.notify('Session deleted', 'success');
      await App.loadAll();
    } catch (err) { App.notify(err.message, 'error'); }
  }

  async function refreshSessions() {
    await App.loadAll();
    App.notify('Refreshed', 'success');
  }

  function toggleGroup(id) {
    const el = document.getElementById(id);
    const header = el.previousElementSibling;
    if (el.style.display === 'none') {
      el.style.display = '';
      header.classList.remove('collapsed');
    } else {
      el.style.display = 'none';
      header.classList.add('collapsed');
    }
  }

  function render() {
    renderSessions();
    renderSnippets();
  }

  // ── Helpers ───────────────────────────────────────────────────────
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1048576) return (bytes/1024).toFixed(1) + 'K';
    if (bytes < 1073741824) return (bytes/1048576).toFixed(1) + 'M';
    return (bytes/1073741824).toFixed(1) + 'G';
  }
  function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const map = { txt:'📄', log:'📋', conf:'⚙️', cfg:'⚙️', yml:'⚙️', yaml:'⚙️', json:'📋', sh:'📜', py:'🐍', js:'📜', html:'🌐', css:'🎨', png:'🖼️', jpg:'🖼️', jpeg:'🖼️', gif:'🖼️', zip:'📦', tar:'📦', gz:'📦', pdf:'📕', md:'📝' };
    return map[ext] || '📄';
  }

  return { render, renderSessions, renderSnippets, openSftp, sftpNavigate, sftpClick, sftpDownload, sftpDelete, dragOver, dragLeave, dropFiles, connectSession, editSession, deleteSession, refreshSessions, toggleGroup, loadSftp, dragStart, dropSession, get sftpSessionId() { return sftpSessionId; } };
})();
