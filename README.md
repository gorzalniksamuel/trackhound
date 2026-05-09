# Trailhound 🐕

> **Sniff out what your AI agent is doing.**

Know exactly what your AI agent did—before you review the diff.

[![CI](https://github.com/gorzalniksamuel/trailhound/actions/workflows/ci.yml/badge.svg)](https://github.com/gorzalniksamuel/trailhound/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Why Trailhound?

AI coding agents are evolving from autocomplete into autonomous operators. You tell them "fix the bug," and they:

- Touch files you didn't expect
- Install dependencies without asking
- Call external APIs and domains
- Access secrets and credentials
- Run shell commands in your environment

**Trailhound tracks everything:**

- 📁 **Files touched** - Reads, writes, deletes across your repo
- 🖥️ **Commands run** - Shell executions with args and exit codes
- 📦 **Packages installed** - npm, pip, cargo, and more
- 🌐 **Network calls** - External domains and APIs contacted
- 🔐 **Secrets accessed** - .env, SSH keys, credentials
- 📝 **Git changes** - Complete before/after diffs
- ⚠️ **Risk analysis** - Behavioral anomalies and policy violations

---

## Quick Start

```bash
# Install
npm install -g trailhound

# Record a Codex session
trailhound run -- codex

# Record Claude Code
trailhound run -- claude-code

# View the report
trailhound report
```

---

## Example Report

```
Run: fix-auth-bug
Agent: codex
Duration: 14m 22s
Risk Score: Medium ⚠️
Tracked By: Trailhound

Summary:
- Modified 6 files
- Ran 18 shell commands
- Installed 2 npm packages
- Contacted 4 external domains
- ⚠️ Read sensitive file: .env.local
- ✅ Tests passed

Notable Events:
🔴 [WARN] Agent read .env.local after task prompt did not mention secrets
🔴 [WARN] New dependency added: jsonwebtoken@latest
✅ [OK] Tests passed: npm test
✅ [OK] Final git diff limited to src/auth/* and package-lock.json
```

---

## Sniffing Out Agent Behavior

Like a bloodhound tracking a scent, **Trailhound follows the trail** your AI agent leaves behind:

- Which files were sniffed before the fix?
- What commands were run in the background?
- Where did the agent wander on the network?
- Did it dig into any secrets?

**Full trace visibility. No more blind trust.**

---

## Supported Agents

| Agent | Status | Notes |
|-------|--------|-------|
| [OpenAI Codex](https://github.com/openai/codex) | ✅ Works | CLI wrapper mode |
| [Claude Code](https://github.com/anthropics/claude-code) | ✅ Works | Native PTY capture |
| [OpenCode](https://github.com/opencode-ai/opencode) | ✅ Works | Generic process wrapper |
| [OpenClaw](https://github.com/openclaw/openclaw) | ✅ Works | Detects delegated sub-agents |
| Pipedream / Pi | 🔄 Planned | Via OpenClaw integration |
| Custom agents | ✅ Works | Any CLI-process agent |

---

## What's Recorded?

```
.trailhound/
└── runs/
    └── 2026-05-08T10-22-31Z_fix-auth-bug/
        ├── manifest.json       # Run metadata
        ├── events.jsonl        # Time-ordered event stream
        ├── terminal.cast       # Terminal transcript (asciicast v2)
        ├── git-before.patch    # Git state before
        ├── git-after.patch     # Git state after
        ├── files/              # Snapshots of modified files
        ├── network.json        # Domain/connection log
        ├── packages.json       # Dependency changes
        ├── report.md           # Human-readable summary
        └── report.html         # Interactive HTML report
```

---

## Features

- 🔍 **Universal Agent Support** - Works with any agent via process wrapper
- 📊 **Rich Reports** - Markdown, HTML, and terminal output
- 🔐 **Secret Detection** - Warns when agents access sensitive files
- 📈 **Risk Scoring** - Explainable, rule-based risk assessment
- 🎬 **Replay Mode** - Step through what the agent did
- 🔄 **Git Integration** - Pre/post snapshots and diff tracking
- 🛡️ **Policy Engine** - Optional blocking/warning for risky actions
- 🧩 **MCP Proxy** - Intercept and log MCP tool calls

---

## Policy Configuration

Create `.trailhound/policy.yml` to set boundaries:

```yaml
mode: warn  # off | record | warn | enforce

allowed_paths:
  - src/**
  - tests/**
  - package.json
  - package-lock.json

blocked_paths:
  - .env*
  - ~/.ssh/**
  - ~/.aws/**

groups:
  secrets:
    warn: true
  network:
    unknown_domains: warn
  packages:
    require_approval: true
    block_latest: true

commands:
  block:
    - "rm -rf /"
    - "curl * | sh"
  require_approval:
    - "npm install *"
    - "pip install *"
```

---

## Installation

```bash
# From npm (coming soon)
npm install -g trailhound

# From source
git clone https://github.com/gorzalniksamuel/trailhound.git
cd trailhound
npm install
npm run build
npm link
```

---

## CLI Usage

```
trailhound run -- <agent-command>    # Record a session
trailhound report [run-id]             # Generate report
trailhound list                        # List recorded runs
trailhound replay <run-id>             # Replay session
trailhound compare <run-a> <run-b>     # Compare runs
trailhound tui                         # Interactive TUI
```

---

## Usage

```bash
# Record a session
trailhound run -- <command>

# Examples:
trailhound run -- codex
trailhound run -- claude-code
trailhound run -- openclaw coding-agent
trailhound run -- npx opencode

# View reports
trailhound report              # Last run
trailhound report --last       # Same
trailhound report <run-id>     # Specific run
trailhound report --html       # Open HTML report

# List runs
trailhound list
trailhound list --json

# Replay a session
trailhound replay <run-id>

# Compare two runs
trailhound compare <run-id-1> <run-id-2>

# TUI viewer
trailhound tui
```

---

## Architecture

Trailhound uses a lightweight supervisor process that wraps your agent:

```
trailhound run -- codex
      |
      v
+------------------+
|    Supervisor    |
+------------------+
  |        |        |        |        |
  v        v        v        v        v
 PTY   Process   Filesystem  Git    Network
Recorder Monitor  Monitor  Snapshotter  Proxy
```

**Key Components:**

- **Supervisor** - Owns the agent process tree
- **PTY Recorder** - Captures terminal I/O
- **Process Monitor** - Tracks spawned processes  
- **Filesystem Monitor** - Watches file reads/writes
- **Git Snapshotter** - Pre/post run state
- **Network Proxy** - Logs external connections
- **Policy Engine** - Evaluates and enforces rules
- **Trace Writer** - Streams events to disk

---

## Documentation

- [Architecture](./docs/architecture.md)
- [Policy Reference](./docs/policy.md)
- [Trace Format](./docs/trace-format.md)
- [Contributing](./CONTRIBUTING.md)

---

## Roadmap

- [x] MVP: Basic recording and reporting
- [ ] Policy engine with warn/block modes
- [ ] GitHub Action for PR audits
- [ ] Agent-specific adapters (Codex, Claude)
- [ ] MCP proxy support
- [ ] TUI session viewer
- [ ] Trace replay
- [ ] Team dashboards
- [ ] SARIF export
- [ ] OpenTelemetry integration

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT © [Samuel Gorzalnik](https://github.com/gorzalniksamuel)

---

## Why "Trailhound"?

A **bloodhound** is a dog breed famous for its ability to follow a scent trail over great distances, even days old. 

**Trailhound** applies the same principle to AI agents:
- Follows the trail of what happened
- Sniffs out secrets and anomalies
- Tracks network connections
- Never loses the scent

> *"Like a bloodhound on the trail—Trailhound always knows where your agent has been."*

---

## Related

- [OpenAI Codex](https://github.com/openai/codex) - The agent we're tracking
- [Claude Code](https://github.com/anthropics/claude-code) - Another agent we follow
- [OpenClaw](https://github.com/openclaw/openclaw) - Local AI assistant platform
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io) - Interoperability for agent tools

> *"Sniff out what your AI agent is doing."*
