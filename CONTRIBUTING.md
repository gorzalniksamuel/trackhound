# Contributing to TraceHound

Thank you for your interest in contributing to AgentBox! This document provides guidelines for contributing to the project.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/gorzalniksamuel/tracehound.git
cd tracehound

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Link for local development
npm link
```

## Project Structure

```
tracehound/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── core/               # Core tracking logic
│   │   ├── tracehound.ts     # Main orchestrator
│   │   ├── trace-writer.ts # Event persistence
│   │   └── run-store.ts    # Run metadata storage
│   ├── recorders/          # Monitoring components
│   │   ├── pty-recorder.ts      # Terminal recording
│   │   ├── filesystem-monitor.ts # File watcher
│   │   ├── git-snapshotter.ts    # Git state capture
│   │   ├── process-monitor.ts    # Process tracking
│   │   ├── network-monitor.ts    # Network observer
│   │   └── secret-detector.ts    # Secret detection
│   ├── policies/           # Policy engine
│   │   └── policy-engine.ts
│   ├── reports/            # Report generation
│   │   └── report-generator.ts
│   ├── adapters/           # Agent-specific adapters
│   │   ├── codex.ts
│   │   ├── claude-code.ts
│   │   └── openclaw.ts
│   └── types/              # Type definitions
│       └── index.ts
├── docs/                   # Documentation
├── tests/                  # Test suite
└── examples/               # Example configurations
```

## Coding Standards

- **TypeScript**: All code must be written in TypeScript
- **Linting**: Run `npm run lint` before committing
- **Formatting**: Code should be formatted with `npm run format`
- **Tests**: Add tests for new functionality

## Commit Guidelines

- Use clear, descriptive commit messages
- Reference issue numbers when applicable
- Follow conventional commits style:
  - `feat: add new feature`
  - `fix: resolve bug`
  - `docs: update documentation`
  - `refactor: improve code`
  - `test: add tests`
  - `chore: maintenance tasks`

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes
6. Push to your fork
7. Open a Pull Request

## Areas for Contribution

- [ ] Additional agent adapters
- [ ] Enhanced network monitoring
- [ ] Policy rule improvements
- [ ] Report generation enhancements
- [ ] Documentation improvements
- [ ] Bug fixes
- [ ] Performance optimizations

## Questions?

Feel free to open an issue for:
- Bug reports
- Feature requests
- Documentation improvements
- General questions

## Code of Conduct

Be respectful, collaborative, and constructive. Harassment and discrimination will not be tolerated.
