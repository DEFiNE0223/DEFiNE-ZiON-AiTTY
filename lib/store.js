const fs   = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

function read(file) {
  const p = path.join(DATA, file);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function write(file, data) {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(data, null, 2), 'utf8');
}

// Sessions
const readSessions  = () => read('sessions.json')  || [];
const writeSessions = (d) => write('sessions.json', d);

// Snippets
const readSnippets  = () => read('snippets.json')  || [];
const writeSnippets = (d) => write('snippets.json', d);

// Config (master password hash, settings)
const readConfig    = () => read('config.json')    || {};
const writeConfig   = (d) => write('config.json', d);

// AI API Keys (encrypted)
const readApiKeys  = () => read('apikeys.json')  || {};
const writeApiKeys = (d) => write('apikeys.json', d);

module.exports = { readSessions, writeSessions, readSnippets, writeSnippets, readConfig, writeConfig, readApiKeys, writeApiKeys };
