/**
 * SFTP Handler — maintains SFTP sessions per SSH session.
 * sessionId → sftp instance
 */
const { Client } = require('ssh2');

const CONNECT_TIMEOUT = 12000; // ms

class SFTPHandler {
  constructor() {
    this.clients = new Map(); // sessionId → { ssh, sftp }
  }

  _connect({ host, port = 22, username, password, privateKey }) {
    return new Promise((resolve, reject) => {
      const ssh = new Client();
      let settled = false;
      const done = (err, val) => {
        if (settled) return;
        settled = true;
        if (err) { try { ssh.end(); } catch {} reject(err); }
        else resolve(val);
      };

      // Overall timeout in case ssh2's readyTimeout doesn't fire
      const timer = setTimeout(() => done(new Error('SFTP connection timed out')), CONNECT_TIMEOUT);

      ssh.on('ready', () => {
        ssh.sftp((err, sftp) => {
          clearTimeout(timer);
          if (err) return done(err);
          done(null, { ssh, sftp });
        });
      });
      ssh.on('error', (err) => { clearTimeout(timer); done(err); });
      ssh.on('timeout', ()  => { clearTimeout(timer); done(new Error('SSH handshake timed out')); });
      ssh.on('close',  ()  => { clearTimeout(timer); done(new Error('SSH connection closed unexpectedly')); });

      const cfg = { host, port: Number(port), username, readyTimeout: CONNECT_TIMEOUT };
      if (privateKey) cfg.privateKey = privateKey;
      else            cfg.password   = password;
      ssh.connect(cfg);
    });
  }

  async getClient(sessionId, connInfo) {
    // If cached client exists, verify it's still alive
    if (this.clients.has(sessionId)) {
      const { ssh, sftp } = this.clients.get(sessionId);
      // Test if the SFTP channel is still usable
      if (sftp && !sftp._writableState?.destroyed) {
        return sftp;
      }
      // Stale — close and reconnect
      this.close(sessionId);
    }
    const client = await this._connect(connInfo);
    this.clients.set(sessionId, client);
    return client.sftp;
  }

  async list(sessionId, connInfo, remotePath) {
    const sftp = await this.getClient(sessionId, connInfo);
    return new Promise((resolve, reject) => {
      sftp.readdir(remotePath, (err, list) => {
        if (err) { this.close(sessionId); return reject(err); }
        resolve(list.map(f => ({
          name:     f.filename,
          isDir:    f.attrs.isDirectory(),
          size:     f.attrs.size,
          modified: new Date(f.attrs.mtime * 1000).toISOString(),
          mode:     f.attrs.mode,
        })).sort((a, b) => b.isDir - a.isDir || a.name.localeCompare(b.name)));
      });
    });
  }

  async download(sessionId, connInfo, remotePath) {
    const sftp = await this.getClient(sessionId, connInfo);
    return new Promise((resolve, reject) => {
      const chunks = [];
      const rs = sftp.createReadStream(remotePath);
      rs.on('data', c => chunks.push(c));
      rs.on('end',  () => resolve(Buffer.concat(chunks)));
      rs.on('error', (err) => { this.close(sessionId); reject(err); });
    });
  }

  async upload(sessionId, connInfo, remotePath, buffer) {
    const sftp = await this.getClient(sessionId, connInfo);
    return new Promise((resolve, reject) => {
      const ws = sftp.createWriteStream(remotePath);
      ws.on('close', resolve);
      ws.on('error', (err) => { this.close(sessionId); reject(err); });
      ws.end(buffer);
    });
  }

  async mkdir(sessionId, connInfo, remotePath) {
    const sftp = await this.getClient(sessionId, connInfo);
    return new Promise((resolve, reject) =>
      sftp.mkdir(remotePath, err => { if (err) { this.close(sessionId); return reject(err); } resolve(); })
    );
  }

  async remove(sessionId, connInfo, remotePath) {
    const sftp = await this.getClient(sessionId, connInfo);
    return new Promise((resolve, reject) =>
      sftp.unlink(remotePath, err => { if (err) { this.close(sessionId); return reject(err); } resolve(); })
    );
  }

  async rename(sessionId, connInfo, oldPath, newPath) {
    const sftp = await this.getClient(sessionId, connInfo);
    return new Promise((resolve, reject) =>
      sftp.rename(oldPath, newPath, err => { if (err) { this.close(sessionId); return reject(err); } resolve(); })
    );
  }

  close(sessionId) {
    const c = this.clients.get(sessionId);
    if (c) { try { c.ssh.end(); } catch {} this.clients.delete(sessionId); }
  }
}

module.exports = new SFTPHandler();
