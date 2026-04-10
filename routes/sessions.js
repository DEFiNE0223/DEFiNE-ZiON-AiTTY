const express = require('express');
const router  = express.Router();
const { encrypt, decrypt } = require('../lib/crypto');
const store = require('../lib/store');
const { getMaster } = require('./auth');

function requireUnlocked(req, res, next) {
  if (!getMaster()) return res.status(403).json({ error: 'Locked — unlock first' });
  next();
}

// GET all sessions (credentials redacted)
router.get('/', requireUnlocked, (req, res) => {
  const sessions = store.readSessions().map(s => ({ ...s, credential: '***' }));
  res.json(sessions);
});

// POST create session
router.post('/', requireUnlocked, (req, res) => {
  const { name, group = 'Default', host, port = 22, username, password, privateKey, osType = 'ubuntu', tags = [], notes = '' } = req.body;
  if (!name || !host || !username) return res.status(400).json({ error: 'name, host, username required' });

  const sessions = store.readSessions();
  const master   = getMaster();
  const id       = Date.now().toString(36) + Math.random().toString(36).slice(2);

  const credential = password    ? encrypt(password, master)
                   : privateKey  ? encrypt(privateKey, master)
                   : null;

  const session = { id, name, group, host, port, username, authType: password ? 'password' : 'key', credential, osType, tags, notes, createdAt: new Date().toISOString(), lastUsed: null };
  sessions.push(session);
  store.writeSessions(sessions);
  res.json({ ...session, credential: '***' });
});

// PUT update session
router.put('/:id', requireUnlocked, (req, res) => {
  const sessions = store.readSessions();
  const idx = sessions.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const master = getMaster();
  const updates = req.body;
  if (updates.password)   { updates.credential = encrypt(updates.password, master);   updates.authType = 'password'; delete updates.password; }
  if (updates.privateKey) { updates.credential = encrypt(updates.privateKey, master); updates.authType = 'key';      delete updates.privateKey; }

  sessions[idx] = { ...sessions[idx], ...updates };
  store.writeSessions(sessions);
  res.json({ ...sessions[idx], credential: '***' });
});

// DELETE session
router.delete('/:id', requireUnlocked, (req, res) => {
  const sessions = store.readSessions().filter(s => s.id !== req.params.id);
  store.writeSessions(sessions);
  res.json({ ok: true });
});

// Internal: get decrypted session info (used by other modules)
function getDecrypted(id) {
  const master = getMaster();
  if (!master) return null;
  const s = store.readSessions().find(s => s.id === id);
  if (!s) return null;
  const cred = s.credential ? decrypt(s.credential, master) : null;
  return {
    ...s,
    password:   s.authType === 'password' ? cred : undefined,
    privateKey: s.authType === 'key'      ? cred : undefined,
    credential: undefined,
  };
}

// Update lastUsed
function touchSession(id) {
  const sessions = store.readSessions();
  const s = sessions.find(s => s.id === id);
  if (s) { s.lastUsed = new Date().toISOString(); store.writeSessions(sessions); }
}

// Reorder sessions
router.post('/reorder', requireUnlocked, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
  const sessions = store.readSessions();
  const map = Object.fromEntries(sessions.map(s => [s.id, s]));
  const reordered = ids.map(id => map[id]).filter(Boolean);
  // Append any sessions not in the ids list at the end
  const reorderedIds = new Set(ids);
  sessions.filter(s => !reorderedIds.has(s.id)).forEach(s => reordered.push(s));
  store.writeSessions(reordered);
  res.json({ ok: true });
});

// ── Export sessions (re-encrypt credentials with backup password) ────
router.post('/export', requireUnlocked, (req, res) => {
  const { backupPassword } = req.body;
  if (!backupPassword || backupPassword.length < 4)
    return res.status(400).json({ error: 'Backup password required (min 4 chars)' });

  const master   = getMaster();
  const sessions = store.readSessions();

  const exported = sessions.map(s => {
    if (!s.credential) return { ...s };
    try {
      const plain = decrypt(s.credential, master);
      return { ...s, credential: encrypt(plain, backupPassword) };
    } catch { return { ...s, credential: null }; }
  });

  res.json({
    version:    '1.1',
    app:        'AiTTY',
    exportedAt: new Date().toISOString(),
    sessions:   exported,
  });
});

// ── Import sessions (decrypt with backup password, re-encrypt with master) ──
router.post('/import', requireUnlocked, (req, res) => {
  const { backupPassword, sessions: incoming, mode = 'merge' } = req.body;
  if (!backupPassword)       return res.status(400).json({ error: 'Backup password required' });
  if (!Array.isArray(incoming)) return res.status(400).json({ error: 'Invalid backup data' });

  const master   = getMaster();
  const existing = store.readSessions();

  // Decrypt with backup password, re-encrypt with master
  const imported = incoming.map(s => {
    if (!s.credential) return s;
    try {
      const plain = decrypt(s.credential, backupPassword);
      return { ...s, credential: encrypt(plain, master) };
    } catch { return { ...s, credential: null }; }
  });

  let result;
  if (mode === 'replace') {
    result = imported;
  } else {
    // merge — skip sessions with duplicate id
    const existingIds = new Set(existing.map(s => s.id));
    result = [...existing, ...imported.filter(s => !existingIds.has(s.id))];
  }

  store.writeSessions(result);
  res.json({ ok: true, imported: imported.length, total: result.length });
});

// Session log save (append mode, keeps last 10MB per session)
const fs   = require('fs');
const path = require('path');
const LOG_DIR = path.join(__dirname, '..', 'data', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

router.post('/:id/log', (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.json({ ok: true });
    const logFile = path.join(LOG_DIR, `${req.params.id}.log`);
    // Rotate if > 10MB
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > 10 * 1024 * 1024) {
      fs.renameSync(logFile, logFile + '.old');
    }
    fs.appendFileSync(logFile, content, 'utf8');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Download session log
router.get('/:id/log', requireUnlocked, (req, res) => {
  const logFile = path.join(LOG_DIR, `${req.params.id}.log`);
  if (!fs.existsSync(logFile)) return res.status(404).json({ error: 'No log found' });
  res.setHeader('Content-Disposition', `attachment; filename="session_${req.params.id}.log"`);
  res.setHeader('Content-Type', 'text/plain');
  res.sendFile(logFile);
});

module.exports = { router, getDecrypted, touchSession };
