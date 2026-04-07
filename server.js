const express    = require('express');
const http       = require('http');
const WebSocket  = require('ws');
const path       = require('path');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

const sshMgr  = require('./lib/ssh-manager');
const { router: authRouter, getMaster } = require('./routes/auth');
const { router: sessRouter, getDecrypted, touchSession } = require('./routes/sessions');
const snippetsRouter = require('./routes/snippets');
const sftpRouter     = require('./routes/sftp');
const aiRouter       = require('./routes/ai');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth',     authRouter);
app.use('/api/sessions', sessRouter);
app.use('/api/snippets', snippetsRouter);
app.use('/api/sftp',     sftpRouter);
app.use('/api/ai',       aiRouter);

// Presets endpoint
app.get('/api/presets', (req, res) => {
  const fs   = require('fs');
  const dir  = path.join(__dirname, 'presets');
  const list = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
    try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return null; }
  }).filter(Boolean);
  res.json(list);
});

// WebSocket: one connection per pane
// Protocol:
//   C→S: { type:'connect',    paneId, sessionId }
//   C→S: { type:'input',      paneId, data }
//   C→S: { type:'resize',     paneId, cols, rows }
//   C→S: { type:'disconnect', paneId }
//   C→S: { type:'multi_exec', paneIds:[], command }
//   S→C: { type:'output',     paneId, data }
//   S→C: { type:'connected',  paneId }
//   S→C: { type:'disconnected',paneId }
//   S→C: { type:'error',      paneId, message }

wss.on('connection', (ws) => {
  const activePanes = new Set();

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const { type, paneId } = msg;

    if (type === 'connect') {
      const session = getDecrypted(msg.sessionId);
      if (!session) return ws.send(JSON.stringify({ type: 'error', paneId, message: 'Session not found or locked' }));
      try {
        await sshMgr.connect({
          paneId, ws,
          host:       session.host,
          port:       session.port,
          username:   session.username,
          password:   session.password,
          privateKey: session.privateKey,
        });
        touchSession(msg.sessionId);
        activePanes.add(paneId);
        ws.send(JSON.stringify({ type: 'connected', paneId }));
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', paneId, message: e.message }));
      }
    }

    else if (type === 'input')      sshMgr.input(paneId, msg.data);
    else if (type === 'resize')     sshMgr.resize(paneId, msg.cols, msg.rows);
    else if (type === 'disconnect') { sshMgr.disconnect(paneId); activePanes.delete(paneId); }
    else if (type === 'multi_exec') sshMgr.multiExec(msg.paneIds, msg.command);
    else if (type === 'server_stats') {
      sshMgr.getStats(paneId)
        .then(stats => ws.send(JSON.stringify({ type: 'server_stats', paneId, ...stats })))
        .catch(() => ws.send(JSON.stringify({ type: 'server_stats', paneId, error: true })));
    }
    else if (type === 'server_disk') {
      sshMgr.getDiskInfo(paneId)
        .then(info => ws.send(JSON.stringify({ type: 'server_disk', paneId, info })))
        .catch(() => ws.send(JSON.stringify({ type: 'server_disk', paneId, error: true })));
    }
  });

  ws.on('close', () => {
    for (const id of activePanes) sshMgr.disconnect(id);
  });
});

const PORT = 7654;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[WebSSH] http://127.0.0.1:${PORT}`);
});

module.exports = server;
