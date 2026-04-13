# AiTTY — Project Context

## Tech Stack
- **Backend**: Node.js 18+ / Express 5.x
- **Frontend**: HTML/CSS/JS (xterm.js 5.3, no framework)
- **Terminal**: xterm.js + xterm-addon-fit
- **SSH**: ssh2 (paramiko equivalent)
- **Crypto**: AES-256-GCM (crypto module, PBKDF2 key derivation)
- **WebSocket**: ws package
- **Port**: 7654 (localhost only, no cloud)

## File Structure
```
webssh/
├ server.js               (Express entry, WebSocket, SSH bridge)
├ routes/
│  ├ auth.js             (login, unlock, change password, force reset)
│  ├ sessions.js         (CRUD, encryption, backup/restore)
│  ├ sftp.js             (file manager via ssh2)
│  └ ai.js               (Claude/GPT/Gemini/Groq API proxy)
├ public/
│  ├ index.html          (main UI: auth, sidebar, terminals, modals)
│  ├ css/
│  │  └ app.css          (Catppuccin dark theme, responsive grid)
│  └ js/
│     ├ app.js           (main: auth, lock, modals, state)
│     ├ sidebar.js       (session CRUD, tab switching, drag-to-split)
│     ├ terminal.js      (xterm instances, pane management, AI chat)
│     ├ ai-panel.js      (AI chat, agent mode)
│     ├ presets.js       (command templates)
│     └ modals.js        (modal helpers)
├ data/
│  ├ sessions.json       (encrypted credential vault)
│  ├ snippets.json       (command snippets)
│  ├ api-keys.json       (encrypted API keys)
│  └ config.json         (app settings)
└ launch.bat / launch.sh (cross-platform start scripts)
```

## Key Patterns

### Authentication (routes/auth.js)
```javascript
// POST /auth/login — set master password
// POST /auth/unlock — decrypt vault with password
// POST /auth/lock — clear memory
// POST /auth/change-password — re-encrypt all data
// POST /auth/force-reset — wipe all (no password needed)
```

### Encryption (AES-256-GCM)
```javascript
// derive key: PBKDF2(password, salt)
// encrypt: AES-256-GCM(data, key) → {iv, ciphertext, authTag, salt}
// decrypt: reverse
// Used for: sessions, snippets, api-keys, backups
```

### Session Backup/Restore
```javascript
// Export: decrypt with master → re-encrypt with backup password → JSON
// Import: decrypt with backup password → re-encrypt with master → merge/replace
```

### UI Components (index.html + app.js)
**Modal pattern:**
```html
<div id="modal-xxx" class="modal-backdrop hidden">
  <div class="modal" style="max-width:400px">
    <h2>Title</h2>
    <form>...</form>
    <div class="modal-footer">
      <button class="btn-cancel" onclick="...hide()">Cancel</button>
      <button class="btn-primary" onclick="App.submitXxx()">Submit</button>
    </div>
  </div>
</div>
```

**Tab/Panel switching** (sidebar.js):
```javascript
function switchTab(tabEl) {
  // add .active to tab, show corresponding panel
  // if sidebar.collapsed, auto-expand
}
```

## Git Workflow

**Commit format (Conventional Commits):**
```
feat: add new feature
fix: resolve bug
docs: update README
refactor: code cleanup
chore: dependencies
```

**Commit footer:**
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

**Release flow:**
1. bump version (package.json, README badge)
2. update README (Phase completed, roadmap)
3. `git add` files
4. `git commit -m "feat: v1.2.0 — ..."`
5. `git tag v1.2.0`
6. `git push origin main && git push origin v1.2.0`
7. `gh release create v1.2.0` (or manual GitHub UI)

## Release Checklist
- [ ] Bump `package.json` version
- [ ] Update README: What's New section + Phase roadmap
- [ ] Update status bar version (public/index.html line ~191)
- [ ] git add + commit (conventional format)
- [ ] git tag vX.Y.Z
- [ ] git push origin main + push tag
- [ ] gh release create (auto-generate notes or manual)

## Feature Implementation Template
1. **EnterPlanMode** — plan architecture, file changes
2. **Create/Edit files** — routes, HTML, JS, CSS
3. **Export functions** — in return statement
4. **Test** — preview_start, verify UI
5. **Commit** — conventional format
6. **Update README** — add to What's New or Roadmap

## Bugfix Workflow
1. **Reproduce** — identify steps, check console logs
2. **Locate** — grep code, find root cause
3. **Fix** — minimal change, no scope creep
4. **Test** — verify fix, check no regressions
5. **Commit** — `fix: description`

## Common Commands
```bash
# Start dev server
npm install   # first time
node server.js

# Git
git status
git add .
git commit -m "feat: ..."
git tag v1.2.0
git push origin main && git push origin v1.2.0

# GitHub CLI (gh)
gh release create v1.2.0 --auto-generate-notes
gh pr create --title "..." --body "..."
gh issue list --state open
```

## System Prompt Protection

### Protection Strategy
- **CLAUDE.md**: Comprehensive system prompt locked from modification
- **settings.json**: Permission rules prevent unauthorized changes
  - `deny`: Blocks direct edits to CLAUDE.md and settings.json
  - `ask`: Requires approval for core file modifications (routes, js, server.js)
  - Hooks: Verify intent before Write/Edit operations
- **defaultMode**: Set to "plan" mode for all major changes

### Why Protected?
The system prompt defines the project's identity, constraints, and guidelines. Unauthorized changes could:
- Break encryption patterns
- Violate security principles
- Introduce inconsistent code style
- Compromise the single-user security model

### Modifying System Prompt
To update CLAUDE.md or settings.json:
1. This explicitly requires user approval (deny rule prevents auto-modification)
2. Edit in a worktree or separate session if needed
3. Use `git diff` to review changes before commit
4. Update project documentation if scope changes

## Known Issues / TODOs
- Mobile-responsive terminal not yet implemented
- Custom AI prompt preset marketplace (Phase 5)
- Multi-user collaboration mode (Phase 5)
- Streaming AI responses (Phase 5)
