# TraceHound Architecture

## Overview

TraceHound is a tracking tool for AI coding agents. It wraps agent processes and records everything they do.

```
┌─────────────────────────────────────────────────────────────┐
│                         User                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    tracehound run -- codex                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supervisor                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   PTY    │  │ Process  │  │Filesystem│  │   Git    │  │
│  │ Recorder │  │ Monitor  │  │ Monitor  │  │Snapshotter│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │             │             │          │
│       └─────────────┴──────┬──────┴─────────────┘          │
│                            │                                │
│                            ▼                                │
│                      ┌─────────────┐                        │
│                      │ Trace Store │                        │
│                      │ (JSONL)     │                        │
│                      └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Supervisor

The Supervisor is the main orchestrator. It:

- Spawns the agent process via PTY
- Coordinates all recorders
- Manages the recording lifecycle
- Applies policy decisions
- Generates the final manifest

### 2. PTY Recorder

Records the terminal session.

- Uses `node-pty` for cross-platform PTY support
- Captures stdin/stdout/stderr
- Writes to asciicast v2 format for replay
- Preserves ANSI colors and terminal features

### 3. Process Monitor

Tracks process creation.

- Monitors child processes
- Records command invocations
- Tracks process tree relationships
- Platform-specific implementation:
  - macOS: Endpoint Security (future)
  - Linux: eBPF (future)
  - Windows: ETW (future)
  - MVP: Shell integration

### 4. Filesystem Monitor

Watches file system changes.

- Uses FSEvents (macOS) / inotify (Linux) / USN (Windows)
- Tracks reads, writes, deletes
- Records file hashes
- Tracks permission changes

### 5. Git Snapshotter

Captures repository state.

- Records branch and commit
- Captures pre/post diffs
- Tracks dirty state
- Stores as patches in trace

### 6. Network Monitor

Observes network activity.

Three modes:

- **off**: No network monitoring
- **observe**: Passive monitoring via platform APIs
- **proxy**: HTTP/HTTPS proxy (more detailed capture)

Records:
- DNS resolutions
- TCP connections
- HTTP method/path (proxy mode)
- SNI (TLS hostname)

### 7. Secret Detector

Identifies sensitive file access.

- Known secret paths (.env, .ssh, AWS creds, etc.)
- Pattern matching for high-entropy strings
- Redaction for output

### 8. Policy Engine

Evaluates events against rules.

- Filesystem policies (allowed/blocked paths)
- Command policies (blocked/approval required)
- Network policies (allowed/blocked domains)
- Package policies (approval requirements)

### 9. Trace Store

Persists event stream.

- JSONL format for streaming
- One line per event
- Index-friendly
- Compatible with jq and other tools

### 10. Report Generator

Produces human-readable reports.

- Markdown (terminal-friendly)
- HTML (interactive, shareable)
- JSON (machine-readable)
- SARIF (security tool compatible)

## Event Flow

```
┌─────────────────┐
│   Agent Action  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Monitor Detects │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Policy Evaluates│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ Allow │ │ Block │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ Log   │ │ Alert │
└───────┘ └───────┘
```

## Trace Format

### Directory Structure

```
.tracehound/runs/
└── 2026-05-08T10-22-31_fix-auth-bug/
    ├── manifest.json           # Run metadata
    ├── events.jsonl           # Event stream
    ├── terminal.cast          # Terminal recording
    ├── git-before.patch       # Pre-run git state
    ├── git-after.patch        # Post-run git state
    ├── files/                 # Changed file snapshots
    │   └── src/auth/session.ts
    ├── network.json           # Network log
    ├── packages.json          # Dependency changes
    ├── report.md              # Markdown report
    └── report.html            # HTML report
```

### Event Schema

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "file.write",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "path": "src/auth/session.ts",
  "hash_before": "sha256:abc123...",
  "hash_after": "sha256:def456..."
}
```

### Manifest Schema

```json
{
  "schema": "tracehound.manifest.v1",
  "run": {
    "id": "2026-05-08T10-22-31_fix-auth-bug",
    "name": "fix-auth-bug",
    "timestamp": "2026-05-08T10:22:31.000Z",
    "durationMs": 861500,
    "exitCode": 0
  },
  "agent": {
    "name": "codex",
    "command": ["codex"]
  },
  "repo": {
    "root": "/home/user/projects/api",
    "git": {
      "isRepo": true,
      "branch": "main",
      "commit": "a1b2c3d",
      "dirty": true
    }
  },
  "summary": {
    "filesModified": 6,
    "commandsRun": 18,
    "networkConnections": 4,
    "secretsAccessed": 1
  },
  "warnings": [
    "Secret file accessed: .env.local"
  ]
}
```

## Security Considerations

### Data Retention

- Traces are stored locally by default
- No cloud or remote uploads
- User controls retention
- Git history excluded by default

### Secret Handling

- Known secret patterns detected
- Values redacted in reports
- Original files not copied
- Canaries for false positives

### Network Privacy

- TLS inspection is opt-in
- DNS logging only by default
- No credential interception
- Local-only processing

## Performance

### Async I/O

- All file operations are async
- Events buffered and flushed
- No blocking on network

### Streaming

- Events written as they occur
- Memory usage bounded
- Supports long-running sessions

### Sampling

- Can sample high-frequency events
- Configurable verbosity
- Trade-off between detail and overhead

## Platform Support

### macOS

- FSEvents for file watching
- Endpoint Security for exec tracking
- Keychain for credentials
- Notarized binaries (future)

### Linux

- inotify/fanotify for files
- eBPF for process tracking
- Standard credential locations
- Systemd integration (optional)

### Windows

- USN Journal for files
- ETW for process tracking
- Credential Manager
- Windows Event Log (optional)

## Future Architecture

### Distributed Tracing

- OpenTelemetry export
- Span correlation
- Multi-node workflows

### Plugin System

- Custom monitors
- Custom policies
- Custom exporters

### Cloud Integration

- Optional trace upload
- Team dashboards
- Centralized policy management
