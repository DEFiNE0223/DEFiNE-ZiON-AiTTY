/**
 * SSH Manager — manages active SSH connections per pane.
 * paneId → { ssh, stream, ws }
 */
const { Client } = require('ssh2');

class SSHManager {
  constructor() {
    this.panes = new Map(); // paneId → { ssh, stream, ws }
  }

  connect({ paneId, ws, host, port = 22, username, password, privateKey }) {
    return new Promise((resolve, reject) => {
      const ssh = new Client();

      ssh.on('ready', () => {
        ssh.shell({ term: 'xterm-256color', cols: 220, rows: 50 }, (err, stream) => {
          if (err) { ssh.end(); return reject(err); }

          this.panes.set(paneId, { ssh, stream, ws });

          stream.on('data', (d) => {
            if (ws.readyState === 1)
              ws.send(JSON.stringify({ type: 'output', paneId, data: d.toString() }));
          });

          stream.stderr.on('data', (d) => {
            if (ws.readyState === 1)
              ws.send(JSON.stringify({ type: 'output', paneId, data: d.toString() }));
          });

          stream.on('close', () => {
            if (ws.readyState === 1)
              ws.send(JSON.stringify({ type: 'disconnected', paneId }));
            this.panes.delete(paneId);
            ssh.end();
          });

          resolve();
        });
      });

      ssh.on('error', reject);

      const cfg = { host, port, username, readyTimeout: 10000 };
      if (privateKey) cfg.privateKey = privateKey;
      else            cfg.password   = password;

      ssh.connect(cfg);
    });
  }

  input(paneId, data) {
    const p = this.panes.get(paneId);
    if (p && p.stream) p.stream.write(data);
  }

  resize(paneId, cols, rows) {
    const p = this.panes.get(paneId);
    if (p && p.stream) p.stream.setWindow(rows, cols, 0, 0);
  }

  // Send same command to multiple panes simultaneously
  multiExec(paneIds, command) {
    for (const id of paneIds) this.input(id, command + '\n');
  }

  disconnect(paneId) {
    const p = this.panes.get(paneId);
    if (p) { try { p.ssh.end(); } catch {} this.panes.delete(paneId); }
  }

  disconnectAll() {
    for (const [id] of this.panes) this.disconnect(id);
  }

  listActive() {
    return [...this.panes.keys()];
  }
}

module.exports = new SSHManager();
