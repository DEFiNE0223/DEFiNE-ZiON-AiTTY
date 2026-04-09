/**
 * lib/claude-code-agent.js
 * Calls the locally installed `claude` CLI (Claude Code) in non-interactive
 * print mode via child_process.  No API key needed — uses the user's
 * existing `claude login` session.
 */
const { exec, execSync } = require('child_process');

// ── Locate the claude binary ──────────────────────────────────────────
function findClaudePath() {
  // Try common locations so it works regardless of PATH inherited by Node
  const candidates = [
    'claude',  // plain name — works when Node inherits the right PATH
    process.env.APPDATA ? `${process.env.APPDATA}\\npm\\claude.cmd` : null,  // Windows npm global
    process.env.APPDATA ? `${process.env.APPDATA}\\npm\\claude`     : null,
    '/usr/local/bin/claude',   // macOS Homebrew / global npm
    '/usr/bin/claude',
    `${process.env.HOME}/.npm-global/bin/claude`,
    `${process.env.HOME}/.local/bin/claude`,
  ].filter(Boolean);

  for (const p of candidates) {
    try { execSync(`"${p}" --version`, { timeout: 5000, stdio: 'ignore' }); return p; }
    catch { /* try next */ }
  }
  return null;
}

// ── Check if claude CLI is available ─────────────────────────────────
async function checkClaudeCodeAvailable() {
  return !!findClaudePath();
}

// ── Query claude CLI ──────────────────────────────────────────────────
// messages: [{ role: 'user'|'assistant', content: string }]
// systemPrompt: string | undefined
async function callClaudeCode(messages, systemPrompt) {
  const bin = findClaudePath();
  if (!bin) throw new Error('Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code, then run: claude login');

  // Build a simple prompt string from message history
  // For multi-turn, prepend history as Human/Assistant pairs
  const history = messages.slice(0, -1)
    .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
  const lastMsg = messages[messages.length - 1];
  const prompt  = history ? `${history}\n\nHuman: ${lastMsg.content}` : lastMsg.content;

  // Build CLI args
  const args = [
    '--print',
    '--output-format', 'json',
    '--dangerously-skip-permissions',  // non-interactive, no tool use — safe in this context
  ];
  if (systemPrompt) args.push('--append-system-prompt', systemPrompt);

  return new Promise((resolve, reject) => {
    const claudeCmd = `"${bin}" ${args.join(' ')}`;
    const child = exec(claudeCmd, { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        // Check for auth error
        if (stderr?.includes('login') || stderr?.includes('auth') || stdout?.includes('login')) {
          return reject(new Error('Claude Code not logged in. Run: claude login'));
        }
        return reject(new Error(err.message));
      }
      try {
        const json = JSON.parse(stdout.trim());
        if (json.is_error) return reject(new Error(json.result || 'Claude Code returned an error'));
        resolve(json.result || '(no response)');
      } catch {
        // Fallback: return raw stdout if not JSON
        resolve(stdout.trim() || '(no response)');
      }
    });

    // Write prompt via stdin
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

module.exports = { checkClaudeCodeAvailable, callClaudeCode };
