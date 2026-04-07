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

  getStats(paneId) {
    return new Promise((resolve, reject) => {
      const p = this.panes.get(paneId);
      if (!p || !p.ssh) return reject(new Error('Not connected'));
      const cmd = [
        'HN=$(hostname 2>/dev/null)',
        "IPS=$(hostname -I 2>/dev/null | tr ' ' ',' | sed 's/,*$//')",
        "CPU=$(awk 'NR==1{printf \"%.0f\",($2+$4)*100/($2+$3+$4+$5)}' /proc/stat 2>/dev/null)",
        "MU=$(free -m 2>/dev/null | awk '/^Mem:/{print $3}')",
        "MT=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}')",
        "UP=$(uptime -p 2>/dev/null | sed 's/up //' | head -1)",
        "DK=$(df / 2>/dev/null | awk 'NR==2{gsub(/%/,\"\",$5); print $5}')",
        'printf "HN=%s\\nIPS=%s\\nCPU=%s\\nMU=%s\\nMT=%s\\nUP=%s\\nDK=%s\\n" "$HN" "$IPS" "$CPU" "$MU" "$MT" "$UP" "$DK"'
      ].join('; ');
      p.ssh.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let buf = '';
        stream.on('data', d => { buf += d.toString(); });
        stream.stderr.on('data', () => {});
        stream.on('close', () => {
          const kv = {};
          buf.split('\n').forEach(line => {
            const eq = line.indexOf('=');
            if (eq > 0) kv[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
          });
          const mu = parseInt(kv.MU) || 0;
          const mt = parseInt(kv.MT) || 1;
          resolve({
            hostname: kv.HN  || '—',
            ips:      kv.IPS ? kv.IPS.split(',').filter(Boolean) : [],
            cpu:      kv.CPU ? parseInt(kv.CPU) : null,
            memUsed:  mu,
            memTotal: mt,
            memPct:   mt > 0 ? Math.round(mu * 100 / mt) : null,
            uptime:   kv.UP  || '—',
            diskPct:  kv.DK  ? parseInt(kv.DK) : null,
          });
        });
      });
    });
  }

  getDiskInfo(paneId) {
    return new Promise((resolve, reject) => {
      const p = this.panes.get(paneId);
      if (!p || !p.ssh) return reject(new Error('Not connected'));
      // Show real disks only — filter virtual/container filesystems
      const cmd = "df -h 2>/dev/null | awk 'NR==1{print; next} !/^(tmpfs|devtmpfs|udev|overlay|shm|cgroupfs|none)/{print}'";
      p.ssh.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let buf = '';
        stream.on('data', d => { buf += d.toString(); });
        stream.stderr.on('data', () => {});
        stream.on('close', () => resolve(buf.trim()));
      });
    });
  }

  disconnectAll() {
    for (const [id] of this.panes) this.disconnect(id);
  }

  listActive() {
    return [...this.panes.keys()];
  }
}

module.exports = new SSHManager();
