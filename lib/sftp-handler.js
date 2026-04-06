/**
 * SFTP Handler — maintains SFTP sessions per SSH session.
 * sessionId → sftp instance
 */
const { Client } = require('ssh2');

class SFTPHandler {
  constructor() {
    this.clients = new Map(); // sessionId → { ssh, sftp }
  }

  _connect({ host, port = 22, username, password, privateKey }) {
    return new Promise((resolve, reject) => {
      const ssh = new Client();
      ssh.on('ready', () => {
        ssh.sftp((err, sftp) => {
          if (err) { ssh.end(); return reject(err); }
          resolve({ ssh, sftp });
        });
      });
      ssh.on('error', reject);
      const cfg = { host, port, username, readyTimeout: 10000 };
      if (privateKey) cfg.privateKey = privateKey;
      else            cfg.password   = password;
      ssh.connect(cfg);
    });
  }

  async getClient(sessionId, connInfo) {
    if (this.clients.has(sessionId)) return this.clients.get(sessionId).sftp;
    const client = await this._connect(connInfo);
    this.clients.set(sessionId, client);
    return client.sftp;
  }

  async list(sessionId, connInfo, remotePath) {
    const sftp = await this.getClient(sessionId, connInfo);
    return new Promise((resolve, reject) => {
      sftp.readdir(remotePath, (err, list) => {
        if (err) return reject(err);
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
      rs.on('end', () => resolve(Buffer.concat(chunks)));
      rs.on('error', reject);
    });
  }

  async upload(sessionId, connInfo, remotePath, buffer) {
    const sftp = await this.getClient(sessionId, connInfo);
    return new Promise((resolve, reject) => {
      const ws = sftp.createWriteStream(remotePath);
      ws.on('close', resolve);
      ws.on('error', reject);
      ws.end(buffer);
    });
  }

  async mkdir(sessionId, connInfo, remotePath) {
    const sftp = await this.getClient(sessionId, connInfo);
    return new Promise((resolve, reject) => sftp.mkdir(remotePath, err => err ? reject(err) : resolve()));
  }

  async remove(sessionId, connInfo, remotePath) {
    const sftp = await this.getClient(sessionId, connInfo);
    return new Promise((resolve, reject) => sftp.unlink(remotePath, err => err ? reject(err) : resolve()));
  }

  async rename(sessionId, connInfo, oldPath, newPath) {
    const sftp = await this.getClient(sessionId, connInfo);
    return new Promise((resolve, reject) => sftp.rename(oldPath, newPath, err => err ? reject(err) : resolve()));
  }

  close(sessionId) {
    const c = this.clients.get(sessionId);
    if (c) { try { c.ssh.end(); } catch {} this.clients.delete(sessionId); }
  }
}

module.exports = new SFTPHandler();
