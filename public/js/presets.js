/**
 * presets.js — OS preset command panel
 */
window.PresetPanel = (() => {
  let currentPaneId = null;
  let currentPreset = null;

  function setPreset(paneId, preset) {
    currentPaneId = paneId;
    currentPreset = preset;
  }

  function toggle(paneId) {
    const panel = document.getElementById('preset-panel');
    if (panel.classList.contains('visible') && currentPaneId === paneId) {
      panel.classList.remove('visible');
      return;
    }
    currentPaneId = paneId;
    const pane    = App.state.panes[paneId];
    const session = App.state.sessions.find(s => s.id === pane?.sessionId);
    const preset  = App.state.presets.find(p => p.id === session?.osType);
    if (preset) render(preset, paneId);
    panel.classList.add('visible');
  }

  function render(preset, paneId) {
    document.getElementById('preset-panel-title').textContent = `${preset.icon} ${preset.name}`;
    let html = '';
    for (const cat of (preset.categories || [])) {
      html += `<div class="preset-cat">
        <div class="preset-cat-label">${cat.label}</div>`;
      for (const cmd of cat.commands) {
        html += `<div class="preset-cmd" onclick="PresetPanel.runCmd(${JSON.stringify(cmd.cmd)})">
          <span class="pc-label">${cmd.label}</span>
          <span class="pc-cmd">${cmd.cmd}</span>
        </div>`;
      }
      html += '</div>';
    }
    document.getElementById('preset-panel-body').innerHTML = html;
  }

  function runCmd(cmd) {
    if (!currentPaneId) return;
    const pane = App.state.panes[currentPaneId];
    if (!pane || !pane.connected) {
      App.notify('No connected session', 'warning');
      return;
    }
    // Just paste the command (user can edit trailing args)
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      // Use TermManager's approach
    }
    TermManager.pasteCommand(cmd);
    App.notify(`Command entered: ${cmd}`, 'info', 2000);
  }

  function close() {
    document.getElementById('preset-panel').classList.remove('visible');
  }

  return { setPreset, toggle, render, runCmd, close };
})();
