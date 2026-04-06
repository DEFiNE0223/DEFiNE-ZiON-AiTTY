const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;
const SALT_LEN = 32;
const IV_LEN = 16;
const ITERS = 100000;

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, ITERS, KEY_LEN, 'sha256');
}

function encrypt(text, password) {
  const salt = crypto.randomBytes(SALT_LEN);
  const iv   = crypto.randomBytes(IV_LEN);
  const key  = deriveKey(password, salt);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let enc = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  const tag = cipher.getAuthTag();
  return [salt.toString('hex'), iv.toString('hex'), tag.toString('hex'), enc].join(':');
}

function decrypt(data, password) {
  const [saltH, ivH, tagH, enc] = data.split(':');
  const key = deriveKey(password, Buffer.from(saltH, 'hex'));
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivH, 'hex'));
  decipher.setAuthTag(Buffer.from(tagH, 'hex'));
  return decipher.update(enc, 'hex', 'utf8') + decipher.final('utf8');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERS, 32, 'sha256').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  return crypto.pbkdf2Sync(password, salt, ITERS, 32, 'sha256').toString('hex') === hash;
}

module.exports = { encrypt, decrypt, hashPassword, verifyPassword };
