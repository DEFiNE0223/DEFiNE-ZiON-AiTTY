<div align="center">

```
██████╗ ███████╗███████╗██╗███╗   ██╗███████╗    ███████╗██╗ ██████╗ ███╗   ██╗
██╔══██╗██╔════╝██╔════╝██║████╗  ██║██╔════╝    ╚══███╔╝██║██╔═══██╗████╗  ██║
██║  ██║█████╗  █████╗  ██║██╔██╗ ██║█████╗        ███╔╝ ██║██║   ██║██╔██╗ ██║
██║  ██║██╔══╝  ██╔══╝  ██║██║╚██╗██║██╔══╝       ███╔╝  ██║██║   ██║██║╚██╗██║
██████╔╝███████╗██║     ██║██║ ╚████║███████╗     ███████╗██║╚██████╔╝██║ ╚████║
╚═════╝ ╚══════╝╚═╝     ╚═╝╚═╝  ╚═══╝╚══════╝     ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝
```

### **AiTTY** — AI-Integrated Terminal for Infrastructure Engineers

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.2.0-brightgreen?style=for-the-badge)](https://github.com/DEFiNE0223/DEFiNE-ZiON-AiTTY/releases)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org)
[![xterm.js](https://img.shields.io/badge/xterm.js-5.3-black?style=for-the-badge)](https://xtermjs.org)
[![Claude](https://img.shields.io/badge/Claude-Sonnet%20%7C%20Opus%20%7C%20Haiku-orange?style=for-the-badge)](https://anthropic.com)
[![GPT](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai)](https://openai.com)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=for-the-badge&logo=google)](https://deepmind.google)

</div>

---

## 🚀 Quick Start (3 Steps)

### 1. Install Requirements

**Windows:**
- [Download Node.js LTS](https://nodejs.org) — install & restart PowerShell
- [Download Git](https://git-scm.com/download/win) — install & restart PowerShell

**macOS:**
```bash
brew install node git
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

### 2. Clone & Launch

```bash
git clone https://github.com/DEFiNE0223/DEFiNE-ZiON-AiTTY.git
cd DEFiNE-ZiON-AiTTY
```

**Windows:** Double-click `launch.bat`

**macOS / Linux:**
```bash
./launch.sh
```

**Any OS (manual):**
```bash
npm install
node server.js
```

Then open **http://127.0.0.1:7654** in your browser.

### 3. First Setup

1. **Set Master Password** — encrypts all your data
2. **Add SSH Session** — click `+ Session` → host, port, username, password/key
3. **Connect** — click your session → opens full-size terminal tab

✅ **Done!** You're ready to use AiTTY.

---

## 📖 Complete User Guide

### 🖥️ Terminal & Session Management

**Opening Sessions:**
- Click `+ Session` in sidebar → add SSH connection
- Click session name → opens as full-size tab
- Click session's `📁` button → open SFTP file browser
- Click `✏️` to edit, `🗑️` to delete

**Split View (Side-by-Side):**
- **Method 1:** Click `H` (horizontal) or `V` (vertical) in pane header
- **Method 2:** Drag any session from sidebar → drop on left/right/top/bottom edge of terminal
- Click splitter divider → resize panes
- Click ✕ to exit split mode

**Multi-Server Broadcast:**
- Click checkboxes on sessions to select multiple
- Click `Select All` / `Deselect All` to toggle all at once
- Type command in "Multi-Exec Bar" → runs on all selected servers simultaneously

**Tips:**
- **Focus Info Bar (top):** Shows hostname, IPs, CPU%, MEM%, Uptime, Disk% for focused pane
- **Click disk %** → full `df -h` output
- **Hover IP badge** → see all IP addresses
- Stats refresh every 30 seconds

---

### 🎯 Focus & Multi-Server Commands

**Focus Info Bar** shows live stats for the currently active terminal:
- **Hostname** + **Primary IP** (hover for all IPs)
- **CPU %** — color coded (green/yellow/red)
- **MEM %** — used/total in MB
- **Uptime** — human-readable (`uptime -p`)
- **Disk %** — root partition, click for full breakdown

**Multi-Exec Broadcast:**
```
1. Select sessions (checkbox)
2. Type command in "Multi-Exec Bar"
3. Hit Enter
4. Command runs on all selected servers
```

---

### 📁 SFTP File Manager

**Browse & Manage Files over SSH:**
- Click `📁` on any session → open file browser
- Navigate folders by clicking
- **Upload:** Drag files into drop zone or use file input
- **Download:** Click `⬇️` next to file
- **Delete:** Click `🗑️` on file/folder
- **Back:** Click `..` to go up one level

**Supported:**
- Large files (tested up to 500 MB)
- Recursive folder operations
- Filename auto-escape (safe for special chars)

---

### 🤖 AI Assistant Panel

**Ask AI About Your Servers:**
- Open any terminal → click `🤖` button (bottom right)
- AI chat panel appears
- Ask anything: `"Check disk usage"`, `"Why is CPU high?"`, `"Show k8s pod status"`

**AI Models:**

| Model | Setup | Cost | Best For |
|-------|-------|------|----------|
| **Claude Code (Local)** | `npm install -g @anthropic-ai/claude-code` then `claude login` | Free (uses subscription) | No API key, local |
| **Claude API** | Paste API key in AI tab | Pay-per-token | Deep analysis |
| **GPT-4o** | Paste OpenAI key | Pay-per-token | Fast, general-purpose |
| **Gemini** | Paste Google key | Pay-per-token | Huge context windows |
| **Groq (LLaMA)** | Paste Groq key | Pay-per-token | Ultra-low latency |

**Agent Mode:**
- Enable `🔄 Agent` toggle
- AI suggests command → you review → confirm to execute
- AI sees the output → suggests next step
- Loop until task complete

---

### 💾 Snippets & Preset Commands

**Save Frequently-Used Commands:**
- Click `Snippets` tab in sidebar
- Click `+ Snippet` → name & command
- Click snippet to insert into terminal

**Preset Command Panels:**
- Pre-loaded command templates (Linux, Docker, Kubernetes, etc.)
- Click preset → shows common commands for that system
- Click command → insert into terminal

---

### 🔒 Security & Lock

**Master Password:**
- Set on first launch
- Encrypts all session credentials (AES-256-GCM)
- Never leaves your machine

**Session Lock:**
- Click 🔒 in top-left → locks the app
- Credentials wiped from memory
- Click Unlock → re-enter master password to resume

**Change Master Password:**
- Click ⚙️ → "Change Master Password"
- Re-encrypts all data with new password (zero data loss)

**Factory Reset (Forgot Master Password?):**
- From login screen: Click `⚠️ Factory Reset`
- Erases ALL data (irreversible)
- No password required

**Backup & Restore:**
- Click ⚙️ → "Export Sessions"
- Set backup password → download encrypted JSON
- Later: Click "Import Sessions" → select file + backup password
- Choose: Merge (add new) or Replace (overwrite all)

---

## What's New in v1.2.0

✨ **New Features:**
- **Collapsible Sidebar** — toggle icon-rail mode (click any tab to auto-expand)
- **Session Drag-to-Split** — drag session from list → drop on pane edge to create split
- **Backup & Restore** — encrypted JSON export with backup passphrase
- **Factory Reset** — wipe all data from login screen (no password needed)
- **About Modal** — click version in status bar for app info & release notes

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   DEFiNE-ZiON-AiTTY                      │
├──────────────────────┬──────────────────────────────────┤
│      Frontend        │         Backend                  │
│  xterm.js (terminal) │  Node.js + Express               │
│  Multi-tab + Split   │  WebSocket (SSH bridge)          │
│  AI Chat Panel       │  ssh2 (SSH/SFTP client)          │
│  SFTP Browser        │  AES-256-GCM encryption          │
│  Settings Panel      │  Session & Snippet store         │
│                      │  AI API proxy (Claude/GPT/etc.)  │
└──────────────────────┴──────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       Anthropic API   OpenAI API    Google Gemini API
```

---

## 📋 Roadmap

```
Phase 1: Genesis — ✅ COMPLETE
  [x] High-performance web-SSH bridge
  [x] Session & snippet management
  [x] Split-view terminal
  [x] SFTP browser
  [x] Cross-platform launcher

Phase 2: Fortress — ✅ COMPLETE
  [x] AES-256-GCM encryption vault
  [x] Multi-model AI panel
  [x] AI Agent mode
  [x] Terminal context bridge to AI

Phase 3: Command Center — ✅ COMPLETE (v1.0.0)
  [x] Focus Info Bar (live server stats)
  [x] Tab drag-to-split
  [x] Multi-server broadcast exec

Phase 4: Power UX — ✅ COMPLETE (v1.2.0)
  [x] Collapsible sidebar
  [x] Session drag-to-split
  [x] Backup/restore with encryption
  [x] Factory reset from login
  [x] About modal with version info

Phase 5: Intelligence — 📅 UPCOMING
  [ ] AI-native file manager (smart rename/organize)
  [ ] Kubernetes & Docker dashboard
  [ ] AI session history recovery
  [ ] Streaming AI responses
  [ ] Smart alert system (threshold notifications)

Phase 6: Expansion — 📅 PLANNED
  [ ] macOS Homebrew & Windows MSI installer
  [ ] Custom AI prompt marketplace
  [ ] Multi-user collaboration mode
  [ ] Mobile-responsive UI
  [ ] Plugin/extension system
```

---

## 🛠️ Advanced Setup

### Claude Code (Recommended — No API Key)

Use your existing Claude Pro/Max subscription:

```bash
# Install CLI
npm install -g @anthropic-ai/claude-code

# Login
claude login
```

After login, restart AiTTY — `💻 Claude Code (Local)` shows **✓ Ready**.

### API Key Setup

1. Click **AI** tab in sidebar
2. Click **Register** next to your provider
3. Paste API key → encrypted immediately
4. Never leaves your machine

**Get API keys:**
- Claude → [console.anthropic.com](https://console.anthropic.com)
- GPT → [platform.openai.com](https://platform.openai.com)
- Gemini → [aistudio.google.com](https://aistudio.google.com)
- Groq → [console.groq.com](https://console.groq.com)

---

## 🔑 SSH Key Setup

### Generate SSH Key (if you don't have one)

**Windows (PowerShell):**
```powershell
ssh-keygen -t rsa -b 4096 -f $env:USERPROFILE\.ssh\id_rsa
```

**macOS / Linux:**
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa
```

### Add Public Key to Remote Server

```bash
# From your local machine
cat ~/.ssh/id_rsa.pub | ssh user@remote "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Use Key in AiTTY

1. Create new session
2. Select **Private Key** option
3. Paste contents of `~/.ssh/id_rsa` (entire file)
4. Connect

---

## ❓ FAQ

**Q: Is my password/data safe?**  
A: Yes. All credentials encrypted locally with AES-256-GCM. Encryption keys derived from your master password. Never sent anywhere.

**Q: Can I use this over the internet?**  
A: AiTTY runs on `127.0.0.1:7654` (localhost only) for security. For remote access, set up an SSH tunnel or deploy behind a VPN.

**Q: What if I forgot my master password?**  
A: Click `⚠️ Factory Reset` from the login screen (no password needed). This erases ALL data. Consider exporting a backup first.

**Q: Can I use it with Windows Subsystem for Linux (WSL)?**  
A: Yes. Install Node.js in WSL, run `node server.js`, then access from Windows browser at `http://127.0.0.1:7654`.

**Q: Does it work with Bastion/Jump hosts?**  
A: Not yet. Add the jump host as a separate session and SSH to your target from there.

**Q: How much data can I store?**  
A: Session credentials are stored in `data/sessions.json` (typically < 1 MB per 100 sessions). SFTP downloads are streamed to disk.

**Q: Can multiple people use one instance?**  
A: Currently no — single master password. Collaboration is Phase 6.

---

## 📦 Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| [Node.js](https://nodejs.org) | 18+ | Required |
| [Git](https://git-scm.com) | Any | For cloning & updates |
| SSH Server | Any | Remote machine to connect to |
| AI API Key | — | Optional (only for API models) |

---

## 🤝 Contributing

Pull requests and issues welcome! Found a bug? Have a feature idea? [Open an issue](https://github.com/DEFiNE0223/DEFiNE-ZiON-AiTTY/issues).

---

## 📄 License

MIT License — see [LICENSE](LICENSE) file.

---

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-DEFiNE0223-181717?style=for-the-badge&logo=github)](https://github.com/DEFiNE0223)
[![Release](https://img.shields.io/badge/Release-v1.2.0-brightgreen?style=for-the-badge)](https://github.com/DEFiNE0223/DEFiNE-ZiON-AiTTY/releases/tag/v1.2.0)

Made with ❤️ by [DEFiNE0223](https://github.com/DEFiNE0223)

</div>
