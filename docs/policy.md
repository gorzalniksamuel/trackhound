# Policy Configuration

Trackhound policies let you define rules for what agents can do.

## Policy File

Create `.trackhound/policy.yml` in your repository root:

```yaml
mode: warn

allowed_paths:
  - src/**
  - tests/**
  - docs/**
  - package.json
  - package-lock.json

blocked_paths:
  - .env*
  - ~/.ssh/**
  - ~/.aws/**
  - ~/.gcp/**
  - ~/.azure/**

network:
  default: warn
  allow:
    - registry.npmjs.org
    - pypi.org
    - crates.io
    - api.github.com
  block:
    - pastebin.com
    - transfer.sh
    - "*.ngrok-free.app"
  unknown_domains: warn

packages:
  require_approval: true
  block_latest: true

commands:
  require_approval:
    - "npm install *"
    - "pip install *"
    - "brew install *"
    - "docker run *"
    - "gh secret *"
    - "aws *"
  block:
    - "rm -rf /"
    - "curl * | sh"
    - "wget * | bash"

secrets:
  warn: true
  block: false
```

## Modes

### `off`

No policy enforcement. Events are recorded but not evaluated.

```yaml
mode: off
```

### `record`

Policies are evaluated for logging purposes only.

```yaml
mode: record
```

This is the default mode.

### `warn`

Potentially risky actions trigger warnings. Agent continues.

```yaml
mode: warn
```

Warnings are shown in the terminal and included in reports.

### `enforce`

Potentially risky actions are blocked. Agent may fail.

```yaml
mode: enforce
```

Use this for safety-critical environments.

## Path Policies

### Allowed Paths

```yaml
allowed_paths:
  - src/**
  - tests/**
```

In `enforce` mode, only paths matching these patterns are allowed.

### Blocked Paths

```yaml
blocked_paths:
  - .env*
  - ~/.ssh/**
  - "**/*.secret"
```

These paths trigger warnings or blocks.

### Pattern Syntax

- `**` - Match any number of directories
- `*` - Match any characters except `/`
- `?` - Match single character

Examples:
- `src/**/*.ts` - All TypeScript files in src
- `*.json` - JSON files in root only
- `**/*.secret` - Any file ending in `.secret`

## Network Policies

### Allowed Domains

```yaml
network:
  allow:
    - registry.npmjs.org
    - api.github.com
```

### Blocked Domains

```yaml
network:
  block:
    - pastebin.com
    - "*.ngrok-free.app"
```

### Unknown Domains

```yaml
network:
  unknown_domains: warn  # or allow, block
```

Controls behavior for domains not in either list.

### Default Action

```yaml
network:
  default: warn  # or allow, block
```

## Package Policies

### Require Approval

```yaml
packages:
  require_approval: true
```

Prompts user before installing dependencies.

### Block Latest

```yaml
packages:
  block_latest: true
```

Warns when `@latest` or unpinned versions are used.

### Allow/Block Lists

```yaml
packages:
  allow:
    - typescript
    - eslint
  block:
    - left-pad
    - is-odd
```

## Command Policies

### Require Approval

```yaml
commands:
  require_approval:
    - "npm install *"
    - "pip install *"
    - "docker run *"
```

Prompts user before executing matching commands.

Supports glob patterns:
- `npm install *` - All npm install
- `docker run *` - Any docker run

### Block Commands

```yaml
commands:
  block:
    - "rm -rf /"
    - "curl * | sh"
    - "wget * | bash"
```

These patterns trigger blocks or warnings.

### Built-in Blocked Patterns

These are always blocked in `enforce` mode:

- `rm -rf /`
- `curl | sh` patterns
- `chmod 777`
- Dangerous redirects

## Secret Policies

```yaml
secrets:
  warn: true    # Show warning
  block: false  # Don't block (agent can't work without some secrets)
```

### Known Secret Types

- `.env*` files
- SSH keys (`~/.ssh/*`)
- AWS credentials (`~/.aws/*`)
- GCP credentials
- Azure credentials
- GitHub tokens
- NPM tokens
- SSH config

## Per-Run Overrides

Command line flags override policy file:

```bash
# Override mode
trackhound run --mode enforce -- codex

# Network control
trackhound run --net off -- codex
trackhound run --net proxy -- codex
```

## Examples

### Conservative Policy

```yaml
mode: enforce

allowed_paths:
  - src/**
  - tests/**

blocked_paths:
  - "**/.env*"
  - "**/node_modules/**"
  - "**/.git/**"

network:
  default: block
  allow:
    - registry.npmjs.org
    - api.github.com

packages:
  require_approval: true

commands:
  require_approval:
    - "npm install *"
    - "npx *"

secrets:
  warn: true
```

### Permissive Policy

```yaml
mode: warn

secrets:
  warn: true

commands:
  block:
    - "rm -rf /"
    - "curl * | sh"
```

### Team Policy

```yaml
mode: warn

allowed_paths:
  - src/**
  - tests/**
  - docs/**
  - ".github/**"

blocked_paths:
  - "**/.env.production"
  - "**/secrets/**"

network:
  default: warn
  block:
    - "*.io"
    - pastebin.com

packages:
  require_approval: true

commands:
  require_approval:
    - "gh secret *"
    - "aws *"

secrets:
  warn: true
```

## Policy Validation

Trackhound validates policies on startup:

```bash
trackhound validate-policy
```

Reports any syntax errors or conflicts.
