# Trackhound Trace Format

Trackhound uses a JSON Lines (JSONL) format for event streams. This allows:

- Streaming writes without buffering
- Appending events as they occur
- Efficient parsing with line-by-line tools
- Compatibility with jq and other tools

## File Structure

```
.trailhound/runs/<run-id>/
├── manifest.json     # Run metadata
├── events.jsonl      # Stream of events
├── terminal.cast     # Asciicast v2 terminal recording
├── git-before.patch  # Git state before
└── git-after.patch   # Git state after
```

## Event Schema

All events share this base structure:

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "<event-type>",
  "runId": "2026-05-08T10-22-31_fix-auth-bug"
}
```

### Timestamp (`ts`)

- ISO 8601 format with milliseconds
- UTC timezone

### Event Type (`type`)

See [Event Types](#event-types)

### Run ID (`runId`)

- Unique identifier for the run
- Same as directory name

## Event Types

### Session Events

#### `session.start`

Marks the beginning of a run.

```json
{
  "ts": "2026-05-08T10:22:31.000Z",
  "type": "session.start",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "agent": "codex",
  "command": ["codex"],
  "cwd": "/home/user/project"
}
```

#### `session.end`

Marks the end of a run.

```json
{
  "ts": "2026-05-08T10:36:51.500Z",
  "type": "session.end",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "exitCode": 0,
  "durationMs": 861500
}
```

### Filesystem Events

#### `file.read`

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "file.read",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "path": "src/auth/session.ts",
  "size": 1240
}
```

#### `file.write`

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "file.write",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "path": "src/auth/session.ts",
  "hash_before": "sha256:abc123def456...",
  "hash_after": "sha256:def789ghi012...",
  "size_before": 1240,
  "size_after": 1342
}
```

#### `file.delete`

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "file.delete",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "path": "src/deprecated.ts",
  "hash": "sha256:abc123..."
}
```

### Process Events

#### `process.exec`

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "process.exec",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "pid": 18422,
  "ppid": 18401,
  "cwd": "/home/user/project",
  "argv": ["npm", "install", "jsonwebtoken@latest"],
  "env": { "PATH": "/usr/bin:/bin" }
}
```

#### `process.exit`

```json
{
  "ts": "2026-05-08T10:24:15.001Z",
  "type": "process.exit",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "pid": 18422,
  "exitCode": 0,
  "durationMs": 2168
}
```

### Network Events

#### `network.dns`

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "network.dns",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "hostname": "registry.npmjs.org",
  "ips": ["104.16.20.35", "104.16.21.35"]
}
```

#### `network.connect`

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "network.connect",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "protocol": "tcp",
  "source": {
    "ip": "192.168.1.100",
    "port": 54321
  },
  "destination": {
    "ip": "104.16.20.35",
    "port": 443,
    "hostname": "registry.npmjs.org"
  }
}
```

#### `network.http`

Only in proxy mode:

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "network.http",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "method": "POST",
  "url": "https://registry.npmjs.org/-/npm/v1/security/advisories",
  "headers": {
    "User-Agent": "npm/10.0.0",
    "Accept": "application/json"
  },
  "statusCode": 200
}
```

### Package Events

#### `package.install`

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "package.install",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "manager": "npm",
  "package": "jsonwebtoken",
  "version": "^9.0.0",
  "resolved": "9.0.2",
  "registry": "https://registry.npmjs.org/"
}
```

#### `package.remove`

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "package.remove",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "manager": "npm",
  "package": "lodash"
}
```

### Secret Events

#### `secret.access`

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "secret.access",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "path": "/home/user/project/.env.local",
  "category": "env",
  "redacted": true
}
```

Categories: `env`, `ssh`, `aws`, `gcp`, `azure`, `token`, `key`, `other`

### Terminal Events

#### `terminal.output`

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "terminal.output",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "data": "Running npm install...\n",
  "rendered": true
}
```

#### `terminal.input`

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "terminal.input",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "data": "y",
  "echo": false
}
```

### Git Events

#### `git.commit`

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "git.commit",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "message": "Fix auth issue",
  "sha": "a1b2c3d4e5f6",
  "parent": "f6e5d4c3b2a1"
}
```

#### `git.branch`

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "git.branch",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "name": "feature/auth-fix",
  "action": "create"
}
```

### Policy Events

#### `policy.violation`

```json
{
  "ts": "2026-05-08T10:24:12.833Z",
  "type": "policy.violation",
  "runId": "2026-05-08T10-22-31_fix-auth-bug",
  "rule": "blocked_paths",
  "action": "warn",
  "resource": ".env.local",
  "resolution": "continue"
}
```

## Manifest Schema

The `manifest.json` file contains run metadata:

```json
{
  "schema": "trailhound.manifest.v1",
  "run": {
    "id": "2026-05-08T10-22-31_fix-auth-bug",
    "name": "fix-auth-bug",
    "timestamp": "2026-05-08T10:22:31.000Z",
    "durationMs": 861500,
    "exitCode": 0
  },
  "agent": {
    "name": "codex",
    "command": ["codex"],
    "version": "unknown"
  },
  "repo": {
    "root": "/home/user/project",
    "git": {
      "isRepo": true,
      "branch": "main",
      "commit": "a1b2c3d4e5f6...",
      "dirty": true,
      "remoteUrl": "https://github.com/user/project.git"
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
  ],
  "agentMetadata": {
    "codex": {
      "sessionId": "abc123"
    }
  }
}
```

## Working with Events

### Filtering with jq

```bash
# All file write events
jq 'select(.type == "file.write")' events.jsonl

# Events after specific time
jq 'select(.ts > "2026-05-08T10:30:00Z")' events.jsonl

# Network connections to specific domain
jq 'select(.type == "network.connect" and .destination.hostname == "registry.npmjs.org")' events.jsonl

# Count by event type
jq -s 'group_by(.type) | map({type: .[0].type, count: length})' events.jsonl
```

### Processing with Python

```python
import jsonl
from pathlib import Path

events_file = Path(".trailhound/runs/<run-id>/events.jsonl")

for line in events_file.open():
    event = json.loads(line)
    if event["type"] == "file.write":
        print(f"File modified: {event['path']}")
```

### Processing with Node.js

```javascript
const fs = require('fs');
const readline = require('readline');

async function* readEvents(path) {
  const fileStream = fs.createReadStream(path);
  const rl = readline.createInterface({ input: fileStream });
  
  for await (const line of rl) {
    yield JSON.parse(line);
  }
}

(async () => {
  for await (const event of readEvents('events.jsonl')) {
    if (event.type === 'network.connect') {
      console.log(event.destination.hostname);
    }
  }
})();
```

## Schema Versions

### Current: agentbox.manifest.v1

Introduced: 2025-05-08

### agentbox.manifest.v2 (Future)

Planned changes:
- Structured agent metadata
- Policy rule references
- Event pagination info
- Compression support

## Compression

Traces can be compressed to save space:

```bash
# Compress a run
trailhound compress <run-id>

# Decompress when needed
trailhound decompress <run-id>
```

Compressed files:
- `events.jsonl.gz`
- `terminal.cast.gz`

These are automatically decompressed when reading.
