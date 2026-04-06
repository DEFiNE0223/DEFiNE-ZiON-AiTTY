<div align="center">

```
██████╗ ███████╗███████╗██╗███╗   ██╗███████╗    ███████╗██╗ ██████╗ ███╗   ██╗
██╔══██╗██╔════╝██╔════╝██║████╗  ██║██╔════╝    ╚══███╔╝██║██╔═══██╗████╗  ██║
██║  ██║█████╗  █████╗  ██║██╔██╗ ██║█████╗        ███╔╝ ██║██║   ██║██╔██╗ ██║
██║  ██║██╔══╝  ██╔══╝  ██║██║╚██╗██║██╔══╝       ███╔╝  ██║██║   ██║██║╚██╗██║
██████╔╝███████╗██║     ██║██║ ╚████║███████╗     ███████╗██║╚██████╔╝██║ ╚████║
╚═════╝ ╚══════╝╚═╝     ╚═╝╚═╝  ╚═══╝╚══════╝     ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝
```

### **AiTTY** — *The Ultimate Mission Control*
#### *Where Human Intelligence and AI Agents Redefine the System.*

<br>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org)
[![xterm.js](https://img.shields.io/badge/xterm.js-5.3-black?style=for-the-badge)](https://xtermjs.org)
[![Claude](https://img.shields.io/badge/Claude-Sonnet%20%7C%20Opus%20%7C%20Haiku-orange?style=for-the-badge)](https://anthropic.com)
[![GPT](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai)](https://openai.com)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=for-the-badge&logo=google)](https://deepmind.google)

</div>

---

## 🌌 The Vision: Why ZiON?

기존의 터미널은 오직 **'인간'의 타이핑**만을 위해 존재했습니다.
Claude Code와 같은 최신 도구들은 혁신적이지만, 텍스트 뒤에서 돌아가는 AI의 동작을 우리가 온전히 **통제**하기엔 부족합니다.

**DEFiNE-ZiON-AiTTY**는 AI 에이전트(Claude, Gemini, GPT 등)에게 **'눈'** 과 **'손'** 을 부여하는 동시에,
인간이 그 과정을 실시간으로 모니터링하고 개입할 수 있는 **지능형 성지(ZiON)** 를 구축합니다.

> *우리는 AI가 시스템을 파괴하게 두지 않습니다.*
> *우리는 AI를 통해 시스템을 **DEFiNE** 합니다.*

---

## 🔥 Key Pillars

### 🧠 1. Model-Agnostic Intelligence

특정 AI 서비스에 종속되지 마세요. ZiON-AiTTY는 **멀티 모델 엔진**을 탑재하여 상황에 따라 가장 적합한 에이전트를 소환합니다.

| Model | Best For |
|-------|----------|
| **Claude Opus / Sonnet** | 정교한 코드 분석, 복잡한 로직 설계 |
| **Gemini 2.0 Flash** | 방대한 서버 로그 분석, 대용량 컨텍스트 |
| **GPT-4o** | 빠르고 정확한 범용 시스템 명령어 생성 |
| **Groq (LLaMA)** | 초고속 응답이 필요한 실시간 에이전트 작업 |

---

### 🔐 2. The Fortress — Security First

AI에게 시스템 권한을 주는 것은 위험합니다. 그래서 우리는 가장 강력한 방패를 구축했습니다.

- **AES-256-GCM Vault** — API 키는 마스터 패스워드로 암호화되어 로컬에 저장됩니다. 그 누구도, 심지어 서버도 당신의 키를 볼 수 없습니다.
- **PBKDF2 Key Derivation** — 패스워드에서 암호화 키를 도출하는 군사급 알고리즘 적용.
- **Approval-Gate** — AI가 제안한 모든 명령어는 당신의 승인 없이는 실행되지 않습니다.
- **Local-First** — 모든 데이터는 당신의 물리적 장치 내에 머뭅니다. 클라우드 전송 없음.
- **Session Lock** — 자리를 비울 때 마스터 패스워드로 즉시 잠금. 세션 정보 메모리에서 소거.

---

### ⚡ 3. Unified Mission Control

기존 ssh 툴의 편의성과 AI의 지능을 결합했습니다.

- **High-Speed Web-SSH** — xterm.js 기반 로우 레이턴시 터미널, 분할 화면 지원
- **Real-time AI Sidebar** — 터미널 바로 옆에서 대화·분석·명령을 내리는 일체형 인터페이스
- **Agent Mode** — AI가 명령어를 제안 → 터미널에서 자동 실행 → 결과를 AI에게 피드백 → 루프
- **SFTP Browser** — GUI 파일 탐색, 업/다운로드
- **Snippet Manager** — 자주 쓰는 명령어 즉시 실행
- **Multi-Server Exec** — 선택한 모든 서버에 동시 명령 브로드캐스트

---

## 📊 Comparison: The Edge

| Features | Claude Code (CLI) | Traditional Web-SSH | **DEFiNE-ZiON-AiTTY** |
|----------|:-----------------:|:-------------------:|:----------------------:|
| Model Freedom | Claude Only | ✗ | ✅ Claude, GPT, Gemini, Groq |
| Visual Control | Blind / Text-only | Human-only | ✅ Real-time Dual Control |
| Security Layer | Local Env | Plain Text | ✅ Master-Pass AES-256-GCM |
| Agent Loop | ✗ | ✗ | ✅ Execute → Capture → Analyze |
| Split Terminal | ✗ | △ | ✅ Native Split-View |
| OS Compatibility | CLI-based | Browser-based | ✅ Native Desktop (Win/Mac) |

---

## 🛠️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DEFiNE-ZiON-AiTTY                    │
├──────────────────────────┬──────────────────────────────┤
│       Frontend           │          Backend             │
│  xterm.js (terminal)     │  Node.js + Express           │
│  Split-view UI           │  WebSocket (SSH bridge)      │
│  AI Chat Panel           │  node-ssh2 (SSH client)      │
│  SFTP Browser            │  SFTP handler                │
│  Snippet Manager         │  AES-256-GCM crypto          │
└──────────────────────────┴──────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
       Anthropic API          OpenAI API          Google Gemini API
     (Claude models)        (GPT models)         (Gemini models)
                                    │
                                    ▼
                              Groq API (LLaMA)
```

---

## 🗺️ Roadmap: The Journey to ZiON

```
Phase 1: Genesis ✅ COMPLETE
  [x] High-performance Web-SSH bridge
  [x] Catppuccin dark theme UI
  [x] Session & Snippet management
  [x] Split-view terminal (H/V)
  [x] SFTP browser with upload/download

Phase 2: Fortress ✅ COMPLETE
  [x] AES-256-GCM API Key Vault
  [x] Master Password session lock (PBKDF2)
  [x] Multi-Model AI panel (Claude/GPT/Gemini/Groq)
  [x] AI Agent Mode (Execute → Capture → Analyze loop)
  [x] Terminal context bridge to AI

Phase 3: Intelligence 🚧 UPCOMING
  [ ] AI-Native File Manager (drag & drop)
  [ ] Kubernetes & Docker status dashboard
  [ ] AI session history recovery & log analyzer
  [ ] Streaming AI responses (real-time typing)

Phase 4: Expansion 🔭 PLANNED
  [ ] macOS Homebrew & Windows Installer
  [ ] Custom AI prompt preset marketplace
  [ ] Multi-user collaboration mode
  [ ] Mobile-responsive terminal view
```

---

## 🚀 Quick Start

```bash
# Clone the bastion
git clone https://github.com/DEFiNE0223/DEFiNE-ZiON-AiTTY.git
cd DEFiNE-ZiON-AiTTY
npm install
```

**macOS / Linux**
```bash
chmod +x launch.sh stop.sh
./launch.sh          # 서버 시작 + 브라우저 자동 오픈
./stop.sh            # 서버 종료
```

**Windows**
```bat
launch.bat           ← 더블클릭 (시스템 트레이 앱으로 실행)
```

**공통 (터미널)**
```bash
npm start            # 포그라운드 실행
```

브라우저에서 `http://127.0.0.1:7654` 접속 후 마스터 패스워드를 설정하세요.

---

## 🤝 Contribution & Community

우리는 단순한 코드가 아니라, **미래의 운영 방식을 함께 정의할 동료**를 찾습니다.

- **Pull Requests** — 언제나 환영합니다. 작은 버그 수정이 ZiON을 더 단단하게 만듭니다.
- **Issues** — 제안하고 싶은 기능이 있다면 주저 말고 글을 남겨주세요.

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**DEFiNE** — *Defining the New Standard of AI-System Interaction.*

[![GitHub](https://img.shields.io/badge/GitHub-DEFiNE0223-181717?style=for-the-badge&logo=github)](https://github.com/DEFiNE0223)

<br>

> *"In ZiON, we don't just execute commands.*
> *We **DEFiNE** them."*

</div>
