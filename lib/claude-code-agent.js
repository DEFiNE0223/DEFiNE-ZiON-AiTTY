/**
 * lib/claude-code-agent.js
 * Calls the locally installed `claude` CLI (Claude Code) in non-interactive
 * print mode via child_process.  No API key needed — uses the user's
 * existing `claude login` session.
 */
const { execSync, spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

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

// ── SSH Assistant system prompt injected into every Claude Code call ─
const SSH_SYSTEM_PROMPT = `You are an SSH terminal assistant embedded inside AiTTY, a web-based multi-server SSH management tool.

CRITICAL RULES — follow these exactly:
1. You are NOT running on the remote server. You have NO access to any remote shell, filesystem, or network.
2. You CANNOT execute commands yourself. Never fabricate or guess command output.
3. When the user asks to check something (disk, CPU, processes, logs, etc.), respond with ONLY the exact shell command(s) inside a \`\`\`bash code block\`\`\`. Do not run them yourself.
4. The user's AiTTY agent will execute your code block in the real SSH terminal and return the actual output to you.
5. After receiving real terminal output, analyze it accurately and suggest next steps if needed.
6. Always wait for real output. Never invent results.

Example:
User: "디스크 용량 확인해줘"
You: \`\`\`bash
df -h
\`\`\`

User: (pastes actual df -h output)
You: (analyze the real output)`;

// ── Query claude CLI ──────────────────────────────────────────────────
// messages: [{ role: 'user'|'assistant', content: string }]
// systemPrompt: string | undefined
// model: string | undefined
async function callClaudeCode(messages, systemPrompt, model) {
  const bin = findClaudePath();
  if (!bin) throw new Error('Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code, then run: claude login');

  // Build prompt string from message history
  const history = messages.slice(0, -1)
    .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
  const lastMsg = messages[messages.length - 1];
  const prompt  = history ? `${history}\n\nHuman: ${lastMsg.content}` : lastMsg.content;

  // Merge SSH system prompt with user's custom system prompt
  const combinedSystemPrompt = systemPrompt
    ? `${SSH_SYSTEM_PROMPT}\n\nAdditional context:\n${systemPrompt}`
    : SSH_SYSTEM_PROMPT;

  // Write system prompt to a temp file to avoid shell escaping issues
  const tmpFile = path.join(os.tmpdir(), `aitty_sysprompt_${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, combinedSystemPrompt, 'utf8');

  // Build CLI args as array (spawn — no shell interpolation)
  const args = [
    '--print',
    '--output-format', 'json',
    '--allowedTools', 'none',          // disable ALL local tools
    '--append-system-prompt-file', tmpFile,
  ];
  if (model && model !== 'claude-code') args.push('--model', model);

  return new Promise((resolve, reject) => {
    // Windows needs shell:true to run .cmd scripts
    const child = spawn(bin, args, { shell: process.platform === 'win32', timeout: 120000 });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });

    child.on('close', () => {
      fs.unlink(tmpFile, () => {}); // cleanup temp file
      if (stderr?.includes('login') || stderr?.includes('auth')) {
        return reject(new Error('Claude Code not logged in. Run: claude login'));
      }
      try {
        const json = JSON.parse(stdout.trim());
        if (json.is_error) return reject(new Error(json.result || 'Claude Code returned an error'));
        resolve(json.result || '(no response)');
      } catch {
        resolve(stdout.trim() || stderr.trim() || '(no response)');
      }
    });

    child.on('error', err => {
      fs.unlink(tmpFile, () => {});
      reject(new Error(err.message));
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

module.exports = { checkClaudeCodeAvailable, callClaudeCode };
