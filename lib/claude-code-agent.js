/**
 * lib/claude-code-agent.js
 * Wraps the @anthropic-ai/claude-code SDK for local Claude Code integration.
 * Uses dynamic import() because the SDK is ESM-only.
 */
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// ── Check if `claude` CLI is available on this machine ────────────────
async function checkClaudeCodeAvailable() {
  try {
    await execAsync('claude --version', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

// ── Query Claude Code SDK ─────────────────────────────────────────────
// messages: [{ role: 'user'|'assistant', content: string }]
// systemPrompt: string | undefined
async function callClaudeCode(messages, systemPrompt) {
  // Dynamic import — SDK is ESM, project is CJS
  let query;
  try {
    const mod = await import('@anthropic-ai/claude-code');
    query = mod.query;
  } catch (e) {
    throw new Error('Claude Code SDK load failed: ' + e.message);
  }

  // Format conversation history as a single prompt string
  const history = messages.slice(0, -1)
    .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const lastMsg = messages[messages.length - 1];
  const prompt  = history
    ? `${history}\n\nHuman: ${lastMsg.content}`
    : lastMsg.content;

  const collected = [];
  try {
    for await (const msg of query({
      prompt,
      options: {
        maxTurns: 1,
        ...(systemPrompt ? { systemPrompt } : {}),
      },
    })) {
      collected.push(msg);
    }
  } catch (e) {
    throw new Error('Claude Code query failed: ' + e.message);
  }

  // Result message is the cleanest source of truth
  const result = collected.find(m => m.type === 'result');
  if (result?.result) return result.result;

  // Fallback: extract text content from assistant messages
  for (const msg of collected) {
    if (msg.type === 'assistant') {
      const content = msg.message?.content;
      if (Array.isArray(content)) {
        const text = content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('');
        if (text) return text;
      }
    }
  }

  return '(No response from Claude Code)';
}

module.exports = { checkClaudeCodeAvailable, callClaudeCode };
