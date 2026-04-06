const express = require('express');
const router  = express.Router();
const { hashPassword, verifyPassword } = require('../lib/crypto');
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

module.exports = { router, getMaster, setMaster };
