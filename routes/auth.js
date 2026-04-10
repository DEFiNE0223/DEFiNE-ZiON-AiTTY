const express = require('express');
const router  = express.Router();
const { hashPassword, verifyPassword, encrypt, decrypt } = require('../lib/crypto');
const store = require('../lib/store');

// In-memory master password (cleared on lock)
let masterPassword = null;

const getMaster = () => masterPassword;
const setMaster = (p) => { masterPassword = p; };

// Check if master password is configured
router.get('/status', (req, res) => {
  const cfg = store.readConfig();
  res.json({
    configured: !!(cfg.masterHash),
    unlocked:   !!masterPassword,
  });
});

// First-time setup
router.post('/setup', (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 4) return res.status(400).json({ error: 'Password too short' });
  const cfg = store.readConfig();
  if (cfg.masterHash) return res.status(409).json({ error: 'Already configured' });
  const { salt, hash } = hashPassword(password);
  store.writeConfig({ ...cfg, masterSalt: salt, masterHash: hash });
  masterPassword = password;
  res.json({ ok: true });
});

// Unlock
router.post('/unlock', (req, res) => {
  const { password } = req.body;
  const cfg = store.readConfig();
  if (!cfg.masterHash) return res.status(400).json({ error: 'Not configured' });
  if (!verifyPassword(password, cfg.masterSalt, cfg.masterHash))
    return res.status(401).json({ error: 'Wrong password' });
  masterPassword = password;
  res.json({ ok: true });
});

// Lock
router.post('/lock', (req, res) => {
  masterPassword = null;
  res.json({ ok: true });
});

// ── Change Master Password ────────────────────────────────────────────
// Re-encrypts ALL stored secrets (sessions, API keys) with the new password
router.post('/change-password', (req, res) => {
  if (!masterPassword) return res.status(401).json({ error: 'Unlock required' });
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 4)
    return res.status(400).json({ error: 'New password too short (min 4 chars)' });

  // Verify current password
  const cfg = store.readConfig();
  if (!verifyPassword(currentPassword, cfg.masterSalt, cfg.masterHash))
    return res.status(401).json({ error: 'Current password is incorrect' });

  try {
    // Re-encrypt sessions (credentials stored in s.credential, not s.password)
    const sessions = store.readSessions();
    const reEncryptedSessions = sessions.map(s => {
      if (!s.credential) return s;
      try {
        const plain = decrypt(s.credential, currentPassword);
        return { ...s, credential: encrypt(plain, newPassword) };
      } catch { return s; }
    });
    store.writeSessions(reEncryptedSessions);

    // Re-encrypt API keys
    const apiKeys = store.readApiKeys();
    const reEncryptedKeys = {};
    for (const [provider, encVal] of Object.entries(apiKeys)) {
      try {
        const plain = decrypt(encVal, currentPassword);
        reEncryptedKeys[provider] = encrypt(plain, newPassword);
      } catch { reEncryptedKeys[provider] = encVal; }
    }
    store.writeApiKeys(reEncryptedKeys);

    // Update master hash
    const { salt, hash } = hashPassword(newPassword);
    store.writeConfig({ ...cfg, masterSalt: salt, masterHash: hash });
    masterPassword = newPassword;

    res.json({ ok: true });
  } catch (e) {
    console.error('[Change Password Error]', e.message);
    res.status(500).json({ error: 'Failed to re-encrypt data: ' + e.message });
  }
});

// ── Reset App (full wipe, requires current password) ─────────────────
router.post('/reset', (req, res) => {
  const { password } = req.body;
  const cfg = store.readConfig();

  // Require current password if configured (safety gate)
  if (cfg.masterHash) {
    if (!password) return res.status(400).json({ error: 'Password required to reset' });
    if (!verifyPassword(password, cfg.masterSalt, cfg.masterHash))
      return res.status(401).json({ error: 'Incorrect password' });
  }

  store.writeSessions([]);
  store.writeSnippets([]);
  store.writeApiKeys({});
  store.writeConfig({});
  masterPassword = null;

  res.json({ ok: true });
});

// ── Force Reset (no password — wipes everything from login screen) ────
// Used when user forgot the master password. No auth check — destroys all data.
router.post('/force-reset', (req, res) => {
  store.writeSessions([]);
  store.writeSnippets([]);
  store.writeApiKeys({});
  store.writeConfig({});
  masterPassword = null;
  res.json({ ok: true });
});

module.exports = { router, getMaster, setMaster };
