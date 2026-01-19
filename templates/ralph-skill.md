---
name: ralph
description: CLI tool for running AI agents in loops with PRD-driven task execution. Use to understand ralph commands, PRD lifecycle, and file structure.
---

# Ralph CLI

Ralph runs AI agents headlessly in loops, executing tasks from structured PRDs.

## Getting Started

Run `ralph --help` to discover available commands:

```bash
ralph --help
ralph prd --help
ralph run --help
```

## PRD Lifecycle

1. **Create** - Write PRD markdown in `.ralph/prd/<name>/prd.md` (or use `ralph-prd` skill)
2. **Register** - `ralph prd add <path> <name>` converts markdown to JSON tasks
3. **Execute** - `ralph run <name>` loops agent against tasks until complete

## File Structure

```
.ralph/
├── config.json          # Project configuration
└── prd/
    └── <prd-name>/
        ├── prd.md       # Original PRD markdown
        ├── prd.json     # Structured tasks (auto-generated)
        ├── progress.txt # Cross-iteration memory
        └── iterations/  # Agent session logs
```

## Location Priority

Local (`.ralph/prd/`) takes precedence over global (`~/.ralph/prd/`).
