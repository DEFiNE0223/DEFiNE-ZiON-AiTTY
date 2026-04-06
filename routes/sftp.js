const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const sftp    = require('../lib/sftp-handler');
const { getDecrypted } = require('./sessions');
const { getMaster }    = require('./auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

function requireUnlocked(req, res, next) {
  if (!getMaster()) return res.status(403).json({ error: 'Locked' });
  next();
}

function getConn(sessionId) {
  const s = getDecrypted(sessionId);
  if (!s) throw new Error('Session not found or locked');
  return { host: s.host, port: s.port, username: s.username, password: s.password, privateKey: s.privateKey };
}

// List directory
router.get('/:sid/list', requireUnlocked, async (req, res) => {
  try {
    const files = await sftp.list(req.params.sid, getConn(req.params.sid), req.query.path || '/');
    res.json(files);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Download file
router.get('/:sid/download', requireUnlocked, async (req, res) => {
  try {
    const buf = await sftp.download(req.params.sid, getConn(req.params.sid), req.query.path);
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(req.query.path)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(buf);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Upload file(s)
router.post('/:sid/upload', requireUnlocked, upload.array('files'), async (req, res) => {
  try {
    const remotePath = req.query.path || '/';
    const conn = getConn(req.params.sid);
    for (const file of req.files) {
      await sftp.upload(req.params.sid, conn, `${remotePath}/${file.originalname}`, file.buffer);
    }
    res.json({ ok: true, count: req.files.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create directory
router.post('/:sid/mkdir', requireUnlocked, async (req, res) => {
  try {
    await sftp.mkdir(req.params.sid, getConn(req.params.sid), req.body.path);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete file
router.delete('/:sid/delete', requireUnlocked, async (req, res) => {
  try {
    await sftp.remove(req.params.sid, getConn(req.params.sid), req.query.path);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Rename
router.post('/:sid/rename', requireUnlocked, async (req, res) => {
  try {
    await sftp.rename(req.params.sid, getConn(req.params.sid), req.body.oldPath, req.body.newPath);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Close SFTP session
router.delete('/:sid/close', (req, res) => {
  sftp.close(req.params.sid);
  res.json({ ok: true });
});

module.exports = router;
