# Ralph

PRD-based task tracking CLI for AI coding agents. Run agents headlessly with structured task tracking and progress visibility.

Inspired by [Geoff Huntley's ralph technique](https://ghuntley.com/ralph/) - putting a coding agent in a while loop and letting it work autonomously.

## Installation

```bash
# npm
npm install -g rlph-cli

# or run directly
npx rlph-cli prd add my-feature.md my-feature
```

### From source

```bash
git clone https://github.com/rem4ik4ever/ralph.git
cd ralph
bun install
bun run build
bun link
```

## Usage

### Add a PRD

Convert markdown PRD to trackable JSON tasks:

```bash
ralph prd add <path> <name> [--agent claude]
```

Example:
```bash
ralph prd add feature.md my-feature
```

Creates `~/.ralph/prd/my-feature/` with:
- `prd.md` - original markdown
- `prd.json` - converted tasks with pass/fail tracking
- `progress.txt` - cross-iteration memory

### List PRDs

View all PRDs with status:

```bash
ralph prd list
```

Output:
```
1. my-feature - Add login flow - in_progress (3/7)
2. refactor-api - API cleanup - pending (0/4)
```

### Run PRD

Execute agent loop against a PRD:

```bash
ralph run <prd-name> [--agent claude] [--iterations 4]
```

Example:
```bash
ralph run my-feature -i 10
```

Agent picks up next incomplete task, implements it, runs feedback loops (tests/lint/types), marks task passed, repeats until done.

## How it works

1. Write markdown PRD with tasks and verification steps
2. `ralph prd add` converts to JSON with agent
3. `ralph run` loops agent against PRD tasks
4. Agent updates `prd.json` passes field on completion
5. Agent maintains `progress.txt` with learnings across iterations
6. Stops when all tasks pass or max iterations reached
7. Logs each iteration to `~/.ralph/prd/<name>/iterations/`

## PRD folder structure

```
~/.ralph/prd/<name>/
├── prd.md        # Original markdown
├── prd.json      # Tasks with passes field
├── progress.txt  # Cross-iteration memory
└── iterations/   # Iteration logs
    ├── 0.json
    └── ...
```

## Supported agents

- `claude` - Claude Code CLI (requires [claude](https://claude.ai/claude-code) installed)

## Requirements

- Node.js >= 18
- Claude Code CLI installed and authenticated

## License

MIT
