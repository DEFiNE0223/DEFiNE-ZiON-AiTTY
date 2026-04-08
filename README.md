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
[![Version](https://img.shields.io/badge/Version-1.0.0-brightgreen?style=for-the-badge)](https://github.com/DEFiNE0223/DEFiNE-ZiON-AiTTY/releases)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org)
[![xterm.js](https://img.shields.io/badge/xterm.js-5.3-black?style=for-the-badge)](https://xtermjs.org)
[![Claude](https://img.shields.io/badge/Claude-Sonnet%20%7C%20Opus%20%7C%20Haiku-orange?style=for-the-badge)](https://anthropic.com)
[![GPT](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai)](https://openai.com)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=for-the-badge&logo=google)](https://deepmind.google)

</div>

---

## Overview

Most web-based SSH tools focus on basic terminal access, leaving a gap between real-time multi-server visibility and practical AI integration.

**DEFiNE-ZiON-AiTTY** combines multi-server SSH management, live resource monitoring, and an AI agent loop — supporting multiple models — into a single locally-run web terminal. All data stays on your machine, and AI-suggested commands never execute without explicit user approval.

---

## Features (v1.0.0)

### Terminal & Session Management

| Feature | Description |
|---------|-------------|
| **Multi-tab Interface** | Each session opens in its own dedicated full-size tab |
| **Split-screen Panes** | Split any tab horizontally or vertically via pane header buttons |
| **Tab Drag-to-Split** | Drag a tab to the left / right / top / bottom edge of the pane area — instant split view with resize handle |
| **Pane Drag-to-Swap** | Drag pane headers to reorder within a split layout |
| **Split View Splitter** | Drag the divider to resize split panes; close button to exit split mode |

### Focus Info Bar

Real-time live stats for the currently focused server pane — always visible at the top.

| Stat | Detail |
|------|--------|
| **Hostname** | Remote server hostname |
| **IP Address(es)** | Primary IP shown; `+N` badge for extras (hover for full list) |
| **CPU %** | Live usage via `/proc/stat` — color coded green / yellow / red |
| **MEM %** | Used / Total MB via `free -m` — color coded |
| **Uptime** | Human-readable via `uptime -p` |
| **Disk %** | Root partition usage — click to open full `df -h` popup (container/virtual filesystems filtered) |

> Stats auto-refresh every **30 seconds** per focused pane.

### Session Sidebar

- Saved sessions with quick connect
- Preset OS command panels (Linux, Ubuntu, CentOS, Docker, etc.)
- Select All / Deselect All toggle — select or deselect all panes in one click
- **Multi-Exec Bar** — type one command, broadcast to all selected servers simultaneously

### AI Assistant

- Built-in AI chat panel per pane (Claude / GPT-4o / Gemini / Groq)
- **Agent Mode** — AI suggests command → executes in terminal → captures output → feeds back to AI (loop)
- Terminal output context bridge — AI sees what you see
- All API keys encrypted with AES-256-GCM — never leave your machine

### SFTP File Manager

- GUI file browser over SSH
- Upload / download files with progress
- Inline directory navigation

### Security

- **AES-256-GCM Vault** — session credentials encrypted with master password (PBKDF2 key derivation)
- **Session Lock** — lock the app; credentials wiped from memory until re-authenticated
- **Local-First** — everything runs on `127.0.0.1:7654`; no cloud, no telemetry
- **Approval-Gate** — AI-suggested commands require your confirmation before execution

### Launcher

- **Windows** — system tray app (`tray.ps1`), `launch.bat` for quick start
- **macOS / Linux** — `launch.sh` / `stop.sh` shell scripts
- Auto-installs npm dependencies on first run

---

## Model Support

| Model | Best For |
|-------|----------|
| **Claude Opus / Sonnet** | Deep code analysis, complex logic design |
| **Gemini 2.0 Flash** | Massive server log analysis, huge context windows |
| **GPT-4o** | Fast, accurate general-purpose command generation |
| **Groq (LLaMA)** | Ultra-low latency for real-time agentic tasks |

---

## Comparison

| Feature | Claude Code CLI | Traditional Web-SSH | **DEFiNE-ZiON-AiTTY** |
|---------|:-:|:-:|:-:|
| Model Freedom | Claude Only | - | Claude / GPT / Gemini / Groq |
| Live Server Stats | - | - | CPU / MEM / Disk / IP / Uptime |
| Split Terminal | - | Partial | H / V + Drag-to-Split |
| Multi-Server Exec | - | - | Broadcast to all selected |
| AI Agent Loop | - | - | Execute → Capture → Analyze |
| Security Layer | Local Env | Plain Text | AES-256-GCM Master Vault |
| SFTP Browser | - | Partial | Full GUI |
| Cross-Platform | CLI | Browser | Win / Mac / Linux |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DEFiNE-ZiON-AiTTY                        │
├───────────────────────────┬─────────────────────────────────┤
│        Frontend           │           Backend               │
│  xterm.js v5 (terminal)   │  Node.js + Express              │
│  Multi-tab + Split UI     │  WebSocket (SSH bridge)         │
│  Focus Info Bar           │  ssh2 (SSH/SFTP client)         │
│  Tab Drag-to-Split        │  AES-256-GCM crypto             │
│  AI Chat Panel            │  Session & Snippet store        │
│  SFTP Browser             │  AI API proxy (Claude/GPT/…)    │
│  Snippet / Preset Panel   │                                 │
└───────────────────────────┴─────────────────────────────────┘
                                      │
              ┌───────────────────────┼────────────────────────┐
              ▼                       ▼                        ▼
       Anthropic API            OpenAI API           Google Gemini API
     (Claude models)          (GPT models)           (Gemini models)
                                      │
                                      ▼
                               Groq API (LLaMA)
```

---

## Roadmap

```
Phase 1: Genesis — COMPLETE
  [x] High-performance Web-SSH bridge (xterm.js + ssh2)
  [x] Catppuccin dark theme UI
  [x] Session & Snippet management
  [x] Split-view terminal (H / V)
  [x] SFTP browser with upload / download
  [x] Cross-platform launcher (Windows / macOS / Linux)

Phase 2: Fortress — COMPLETE
  [x] AES-256-GCM encrypted session vault
  [x] Master Password lock / unlock (PBKDF2)
  [x] Multi-Model AI panel (Claude / GPT / Gemini / Groq)
  [x] AI Agent Mode (Execute → Capture → Analyze loop)
  [x] Terminal context bridge to AI

Phase 3: Command Center — COMPLETE  (v1.0.0)
  [x] Focus Info Bar — hostname, IP(s), CPU%, MEM%, Uptime, Disk%
  [x] Multi-IP display — primary + +N badge with full list on hover
  [x] Disk popup — full df -h output, container filesystems filtered
  [x] Session → always opens as new full-size tab
  [x] Tab drag-to-split — drop on edge to create H/V split view
  [x] Resizable split splitter + close button
  [x] Select All / Deselect All pane toggle
  [x] Pane drag-to-swap within split layout

Phase 4: Intelligence — UPCOMING
  [ ] AI-native file manager (drag & drop with AI rename/organize)
  [ ] Kubernetes & Docker status dashboard
  [ ] AI session history recovery & log analyzer
  [ ] Streaming AI responses (real-time token output)
  [ ] Smart alert system (CPU/MEM/Disk threshold notifications)

Phase 5: Expansion — PLANNED
  [ ] macOS Homebrew formula & Windows MSI installer
  [ ] Custom AI prompt preset marketplace
  [ ] Multi-user collaboration mode (shared sessions)
  [ ] Mobile-responsive terminal view
  [ ] Plugin/extension system
```

---

## Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| [Node.js](https://nodejs.org) | 18 or higher | Runtime — required |
| Git | Any | For cloning the repo |
| SSH server | Any | The remote server you want to connect to |
| AI API Key | — | Optional — only needed for AI Agent features |

> All other dependencies install automatically on first launch.

---

## Installing Node.js

<details>
<summary><b>Windows</b></summary>

1. Go to **https://nodejs.org** and download the **LTS** version (`.msi` installer)
2. Run the installer — click Next through all steps, keep all defaults
3. Open **Command Prompt** and verify:
   ```
   node -v
   ```
   You should see something like `v22.x.x`

> Alternative: Install via winget
> ```
> winget install OpenJS.NodeJS.LTS
> ```

</details>

<details>
<summary><b>macOS</b></summary>

**Option A — Official installer**
1. Go to **https://nodejs.org** and download the **LTS** `.pkg` file
2. Run the installer and follow the steps
3. Verify in Terminal:
   ```bash
   node -v
   ```

**Option B — Homebrew**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node
```

</details>

<details>
<summary><b>Linux (Ubuntu / Debian)</b></summary>

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```

</details>

<details>
<summary><b>Linux (RHEL / Fedora / CentOS)</b></summary>

```bash
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo dnf install -y nodejs
node -v
```

</details>

---

## Quick Start

### Step 1 — Clone

```bash
git clone https://github.com/DEFiNE0223/DEFiNE-ZiON-AiTTY.git
cd DEFiNE-ZiON-AiTTY
```

> No git? Click **Code → Download ZIP** on GitHub, then extract.

---

### Step 2 — Launch

**Windows** — double-click `launch.bat`
> First run installs dependencies automatically. Check the system tray for the icon.

**macOS / Linux**
```bash
chmod +x launch.sh stop.sh
./launch.sh
```

**Any OS (terminal)**
```bash
npm install   # first time only
node server.js
```

Then open **http://127.0.0.1:7654** in your browser.

---

### Step 3 — First Setup

1. **Set a Master Password** — encrypts all your data locally.
2. **Add an SSH Session** — click `+ Session` in the sidebar → enter host, port, username, and password or private key.
3. **Connect** — click your session. It opens as a full-size tab.

---

### Step 4 — Split View

- **H / V split**: click the split buttons in the pane header
- **Drag-to-split**: drag any tab and drop it on the **left / right / top / bottom** edge of the terminal area
- **Resize**: drag the splitter divider between panes
- **Exit split**: click the close button on the splitter

---

### Step 5 — AI Agent (Optional)

1. Click the **AI** tab in the left sidebar.
2. Click **Register** next to your preferred provider (Claude, GPT, Gemini, or Groq).
3. Paste your API key — encrypted immediately, never leaves your machine.
4. Open any terminal pane → click the AI button to open the chat panel.
5. Enable **Agent Mode** to let AI run commands and analyze results in a loop.

> API key sources:
> - Claude → [console.anthropic.com](https://console.anthropic.com)
> - GPT → [platform.openai.com](https://platform.openai.com)
> - Gemini → [aistudio.google.com](https://aistudio.google.com)
> - Groq → [console.groq.com](https://console.groq.com)

---

## Contributing

Pull requests and issue reports are welcome. See [CONTRIBUTING](CONTRIBUTING.md) if it exists, or open an issue directly.

---

## License

MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-DEFiNE0223-181717?style=for-the-badge&logo=github)](https://github.com/DEFiNE0223)
[![Release](https://img.shields.io/badge/Release-v1.0.0-brightgreen?style=for-the-badge)](https://github.com/DEFiNE0223/DEFiNE-ZiON-AiTTY/releases/tag/v1.0.0)

</div>
