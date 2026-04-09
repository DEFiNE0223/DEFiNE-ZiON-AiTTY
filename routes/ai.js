/**
 * routes/ai.js — AI API Key management & multi-model chat proxy
 *
 * Supported providers: Claude(Anthropic), GPT(OpenAI), Gemini(Google), Groq
 * API Keys are encrypted with AES-256-GCM using the master password
 */
const express = require('express');
const https   = require('https');
const router  = express.Router();

const cryptoLib = require('../lib/crypto');
const store     = require('../lib/store');
const { getMaster } = require('./auth');
const { checkClaudeCodeAvailable, callClaudeCode } = require('../lib/claude-code-agent');

// ── Supported provider definitions ───────────────────────────────────
const PROVIDERS = {
  claudecode: {
    label:  'Claude Code (Local)',
    icon:   '💻',
    models: ['claude-sonnet-4-5', 'claude-opus-4-5', 'claude-haiku-4-5'],
    noKey:  true,   // No API key — uses local claude CLI session
  },
  claude: {
    label:  'Claude (Anthropic)',
    icon:   '🟠',
    models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
  },
  openai: {
    label:  'GPT (OpenAI)',
    icon:   '🟢',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-mini'],
  },
  gemini: {
    label:  'Gemini (Google)',
    icon:   '🔵',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  groq: {
    label:  'Groq (Fast)',
    icon:   '⚡',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile',
             'mixtral-8x7b-32768', 'gemma2-9b-it'],
  },
};

// ── Middleware: check lock state ──────────────────────────────────────
function requireUnlocked(req, res, next) {
  if (!getMaster()) return res.status(401).json({ error: 'Unlock required' });
  next();
}

// ── GET /api/ai/providers ─────────────────────────────────────────────
// Return provider list + whether key is registered (or CLI available for claudecode)
router.get('/providers', async (req, res) => {
  const keys = store.readApiKeys();
  const ccAvail = await checkClaudeCodeAvailable().catch(() => false);
  const list = Object.entries(PROVIDERS).map(([id, p]) => ({
    id,
    label:  p.label,
    icon:   p.icon,
    models: p.models,
    noKey:  !!p.noKey,
    hasKey: p.noKey ? ccAvail : !!keys[id],
  }));
  res.json(list);
});

// ── POST /api/ai/keys ─────────────────────────────────────────────────
// Save API Key (AES-256-GCM encrypted)
router.post('/keys', requireUnlocked, (req, res) => {
  const { provider, key } = req.body;
  if (!PROVIDERS[provider]) return res.status(400).json({ error: 'Unknown provider' });
  if (!key || !key.trim())  return res.status(400).json({ error: 'Please enter an API Key' });

  const master = getMaster();
  const keys   = store.readApiKeys();
  keys[provider] = cryptoLib.encrypt(key.trim(), master);
  store.writeApiKeys(keys);
  res.json({ ok: true });
});

// ── DELETE /api/ai/keys/:provider ────────────────────────────────────
router.delete('/keys/:provider', requireUnlocked, (req, res) => {
  const keys = store.readApiKeys();
  delete keys[req.params.provider];
  store.writeApiKeys(keys);
  res.json({ ok: true });
});

// ── POST /api/ai/chat ────────────────────────────────────────────────
// AI chat proxy (single response, no streaming)
router.post('/chat', requireUnlocked, async (req, res) => {
  const { provider, model, messages, systemPrompt } = req.body;

  if (!PROVIDERS[provider])
    return res.status(400).json({ error: 'Unknown provider' });

  // ── Claude Code (Local) — no API key needed ──────────────────────
  if (provider === 'claudecode') {
    try {
      const content = await callClaudeCode(messages, systemPrompt, model);
      return res.json({ ok: true, content });
    } catch (e) {
      console.error('[Claude Code Error]', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── API key-based providers ───────────────────────────────────────
  const keys = store.readApiKeys();
  if (!keys[provider])
    return res.status(400).json({ error: `${PROVIDERS[provider].label} API Key not found` });

  let apiKey;
  try {
    apiKey = cryptoLib.decrypt(keys[provider], getMaster());
  } catch {
    return res.status(500).json({ error: 'API Key decryption failed' });
  }

  try {
    let content;
    switch (provider) {
      case 'claude': content = await callClaude(apiKey, model, messages, systemPrompt); break;
      case 'openai': content = await callOpenAI(apiKey, model, messages, systemPrompt, 'openai'); break;
      case 'groq':   content = await callOpenAI(apiKey, model, messages, systemPrompt, 'groq'); break;
      case 'gemini': content = await callGemini(apiKey, model, messages, systemPrompt); break;
      default: return res.status(400).json({ error: 'Unsupported provider' });
    }
    res.json({ ok: true, content });
  } catch (e) {
    console.error('[AI Chat Error]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Common HTTPS request helper ──────────────────────────────────────
function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      { hostname, path, method: 'POST',
        headers: { 'Content-Type': 'application/json',
                   'Content-Length': Buffer.byteLength(payload),
                   ...headers } },
      (resp) => {
        let data = '';
        resp.on('data', c => (data += c));
        resp.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(data); }
          catch { parsed = { _raw: data }; }
          parsed._status = resp.statusCode;
          resolve(parsed);
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Anthropic Claude ──────────────────────────────────────────────────
async function callClaude(apiKey, model, messages, systemPrompt) {
  const body = {
    model:      model || 'claude-3-5-haiku-20241022',
    max_tokens: 4096,
    messages:   messages.map(m => ({ role: m.role, content: m.content })),
  };
  if (systemPrompt) body.system = systemPrompt;

  const result = await httpsPost(
    'api.anthropic.com', '/v1/messages',
    { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body
  );

  // ── Full response log (debug) ──
  console.log('[Claude HTTP]', result._status, JSON.stringify(result).slice(0, 500));

  if (result._raw) {
    console.error('[Claude Raw Response]', result._raw);
    throw new Error('API response parse failed: ' + result._raw.slice(0, 300));
  }
  if (result.error || (result._status && result._status >= 400)) {
    const errDetail = result.error
      ? `[${result.error.type || result._status}] ${result.error.message || JSON.stringify(result.error)}`
      : `HTTP ${result._status}: ${JSON.stringify(result)}`;
    console.error('[Claude API Error]', errDetail);
    throw new Error(errDetail);
  }
  return result.content?.[0]?.text || '(empty response)';
}

// ── OpenAI / Groq (OpenAI-compatible API) ────────────────────────────
async function callOpenAI(apiKey, model, messages, systemPrompt, provider) {
  const msgs = [];
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
  msgs.push(...messages.map(m => ({ role: m.role, content: m.content })));

  const hostname = provider === 'groq' ? 'api.groq.com' : 'api.openai.com';
  const path     = provider === 'groq' ? '/openai/v1/chat/completions' : '/v1/chat/completions';

  const result = await httpsPost(
    hostname, path,
    { 'Authorization': `Bearer ${apiKey}` },
    { model: model || 'gpt-4o-mini', messages: msgs, max_tokens: 4096 }
  );
  if (result._raw) throw new Error('API response parse failed: ' + result._raw.slice(0, 200));
  if (result.error || (result._status && result._status >= 400)) {
    const errDetail = result.error
      ? `[${result.error.code || result._status}] ${result.error.message || JSON.stringify(result.error)}`
      : `HTTP ${result._status}: ${JSON.stringify(result)}`;
    throw new Error(errDetail);
  }
  return result.choices?.[0]?.message?.content || '(empty response)';
}

// ── Google Gemini ─────────────────────────────────────────────────────
async function callGemini(apiKey, model, messages, systemPrompt) {
  // Gemini requires alternating user/model format
  const contents = [];
  for (const m of messages) {
    // Gemini: role is 'user' or 'model'
    const role = m.role === 'assistant' ? 'model' : 'user';
    // Merge consecutive messages with the same role
    if (contents.length && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += '\n' + m.content;
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }

  const body = { contents, generationConfig: { maxOutputTokens: 4096 } };
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };

  const modelId = (model || 'gemini-1.5-flash');
  const result  = await httpsPost(
    'generativelanguage.googleapis.com',
    `/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {},
    body
  );
  if (result._raw) throw new Error('API response parse failed: ' + result._raw.slice(0, 200));
  if (result.error || (result._status && result._status >= 400)) {
    const errDetail = result.error
      ? `[${result.error.status || result._status}] ${result.error.message || JSON.stringify(result.error)}`
      : `HTTP ${result._status}: ${JSON.stringify(result)}`;
    throw new Error(errDetail);
  }
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '(empty response)';
}

module.exports = router;
