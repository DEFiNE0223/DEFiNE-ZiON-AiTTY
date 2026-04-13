# AiTTY — Claude Code System Prompt

## Project Context
You are assisting with **AiTTY** — an AI-Integrated Terminal for Infrastructure Engineers. This is a full-stack web SSH application built with:
- **Backend**: Node.js 18+ / Express 5.x with WebSocket + ssh2
- **Frontend**: HTML/CSS/JS (xterm.js 5.3, vanilla JS, no frameworks)
- **Encryption**: AES-256-GCM for all sensitive data
- **Architecture**: Localhost-only (7654), client-side encrypted vault

## Core Principles

### 1. Security First
- All credentials encrypted AES-256-GCM with PBKDF2 key derivation
- Master password never leaves the application
- SSH sessions managed through websocket bridge
- SFTP operations streamed to disk, never buffered in memory
- No data transmission to cloud services (local-only)

### 2. Code Quality
- Minimal dependencies (ssh2, ws, express only)
- No frameworks in frontend (vanilla JS for performance)
- xterm.js for terminal rendering
- Clean separation: routes/, public/js/, public/css/

### 3. User Experience
- Split-view terminal support (horizontal/vertical)
- Multi-server broadcast commands
- Drag-and-drop session management
- Collapsible sidebar with icon-rail mode
- Live server stats (CPU, MEM, Disk, Uptime)

## Project Structure (Immutable)
```
webssh/
├ server.js               ← Main entry (Express + WebSocket)
├ routes/
│  ├ auth.js             ← Login, unlock, password change
│  ├ sessions.js         ← CRUD + encryption
│  ├ sftp.js             ← File manager (ssh2)
│  └ ai.js               ← Claude/GPT/Gemini/Groq proxy
├ public/
│  ├ index.html          ← Main UI
│  ├ css/app.css         ← Catppuccin theme
│  └ js/
│     ├ app.js           ← Auth, state management
│     ├ sidebar.js       ← Sessions, tabs
│     ├ terminal.js      ← xterm + panes
│     ├ ai-panel.js      ← AI chat
│     ├ presets.js       ← Command templates
│     └ modals.js        ← Modal helpers
├ data/
│  ├ sessions.json       ← Encrypted vaults
│  ├ snippets.json       ← User snippets
│  ├ api-keys.json       ← Encrypted API keys
│  └ config.json         ← Settings
└ .claude/
   ├ CLAUDE.md           ← THIS FILE (system prompt)
   ├ project-aitty.md    ← Technical context
   ├ launch.json         ← Claude Code launcher
   └ settings.json       ← Permissions & hooks
```

## Development Guidelines

### When Adding Features
1. **Plan first** (use EnterPlanMode)
2. **Decide scope**: Is this backend (routes/), frontend (public/), or both?
3. **Encryption required?** Use `routes/sessions.js` patterns (AES-256-GCM + PBKDF2)
4. **Test in preview** before committing
5. **Commit conventionally**: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
6. **Update README** if user-facing

### Code Patterns to Follow

**Backend - Adding a route:**
```javascript
// routes/example.js
module.exports = (app, vault) => {
  app.post('/api/example', (req, res) => {
    // Implementation
    res.json({ success: true });
  });
};

// server.js (add to index)
require('./routes/example')(app, vault);
```

**Frontend - Adding a modal:**
```html
<div id="modal-example" class="modal-backdrop hidden">
  <div class="modal" style="max-width:400px">
    <h2>Title</h2>
    <form>...</form>
    <div class="modal-footer">
      <button class="btn-cancel" onclick="Modal.hideExample()">Cancel</button>
      <button class="btn-primary" onclick="App.submitExample()">Submit</button>
    </div>
  </div>
</div>
```

**Encryption pattern (from sessions.js):**
```javascript
const encryptData = (data, masterKey) => {
  const salt = crypto.randomBytes(32);
  const key = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { iv: iv.toString('hex'), ciphertext: encrypted.toString('hex'), authTag: authTag.toString('hex'), salt: salt.toString('hex') };
};
```

### Frontend Best Practices
- Use xterm.js for terminal rendering (addons: fit, search, web links)
- Manage state in `app.js` (no external store)
- Use fetch() for API calls (no axios)
- CSS classes from Catppuccin theme (--ctp-surface0, --ctp-text, etc.)
- Avoid frameworks; keep JS vanilla for performance

### Testing Requirements
- Test in `npm install && node server.js`
- Browser console should have no errors
- Test SSH connection with real credentials
- Test split-view, drag-to-split, multi-exec
- Verify encryption: change master password, restart, data should be accessible

## Known Constraints

### Cannot Do
- Multi-user collaboration (Phase 5)
- Mobile-responsive terminal (Phase 5)
- Streaming AI responses (Phase 5)
- Bastion/jump host support (not yet)
- Cloud backup (by design — local only)

### Why No Frameworks?
- xterm.js conflicts with React/Vue virtual DOM
- WebSocket state needs real-time updates
- Keeps bundle small (single HTML file load)
- Better control over encryption lifecycle

## Security Checklist (Before Commit)
- [ ] No hardcoded API keys or passwords
- [ ] Encryption patterns match existing code
- [ ] Master password never logged
- [ ] SSH keys never copied to frontend
- [ ] SFTP operations don't buffer entire files
- [ ] WebSocket handlers validate input

## Phase Roadmap
- **Phase 1-3**: ✅ COMPLETE (v1.0.0)
- **Phase 4**: ✅ COMPLETE (v1.2.0) — Collapsible sidebar, drag-to-split, backup/restore
- **Phase 5**: 📅 Upcoming — AI intelligence, K8s dashboard, streaming responses
- **Phase 6**: 📅 Planned — Homebrew/MSI, marketplace, collaboration, plugins

## When Unsure
1. Read `.claude/project-aitty.md` for technical details
2. Check `README.md` for user-facing behavior
3. Look at existing patterns in `routes/` and `public/js/`
4. Ask before major refactors or new dependencies
5. Keep commits small and focused

---

**This system prompt is locked. Modifications require explicit approval.**
