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

### Initialize Project

Set up ralph in your project and install Claude Code skills:

```bash
ralph init
```

Creates `.ralph/` directory and installs skills to `~/.claude/skills/`:
- `ralph-prd` - PRD creation skill
- `ralph` - CLI documentation skill

### Add a PRD

Convert markdown PRD to trackable JSON tasks:

```bash
ralph prd add <path> <name> [--agent claude]
```

Example:
```bash
ralph prd add .ralph/prd/my-feature/prd.md my-feature
```

Creates:
- `prd.json` - converted tasks with pass/fail tracking
- `progress.txt` - cross-iteration memory

### List PRDs

View all PRDs with status:

```bash
ralph prd list
```

Output:
```
NAME           STATUS        PROGRESS  LOCATION
my-feature     in_progress   3/7       local
refactor-api   pending       0/4       global
```

### Show PRD Info

Display PRD details and file locations:

```bash
ralph prd info <name>
```

Output:
```
PRD: my-feature
Status: in_progress (3/7 tasks complete)

Files:
  prd.md:      .ralph/prd/my-feature/prd.md
  prd.json:    .ralph/prd/my-feature/prd.json
  progress:    .ralph/prd/my-feature/progress.txt
  iterations:  .ralph/prd/my-feature/iterations/ (2 files)
```

### Delete PRD

Remove a PRD and all associated files:

```bash
ralph prd delete <name>
ralph prd delete <name> --force  # skip confirmation
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

1. `ralph init` sets up project and installs Claude Code skills
2. Write markdown PRD (or use `ralph-prd` skill in Claude Code)
3. `ralph prd add` converts markdown to JSON tasks
4. `ralph run` loops agent against PRD tasks
5. Agent updates `prd.json` passes field on completion
6. Agent maintains `progress.txt` with learnings across iterations
7. Stops when all tasks pass or max iterations reached
8. `ralph prd info` shows progress and file locations

## PRD folder structure

Local PRDs (in project):
```
.ralph/
├── config.json   # Project configuration
└── prd/<name>/
    ├── prd.md        # Original markdown
    ├── prd.json      # Tasks with passes field
    ├── progress.txt  # Cross-iteration memory
    └── iterations/   # Iteration logs
```

Global PRDs (fallback):
```
~/.ralph/prd/<name>/
└── ...
```

Local PRDs take precedence over global when both exist.

## Supported agents

- `claude` - Claude Code CLI (requires [claude](https://claude.ai/claude-code) installed)

## Requirements

- Node.js >= 18
- Claude Code CLI installed and authenticated

## Releases

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated versioning and npm publishing.

### How it works

1. Push/merge to `main` triggers release workflow
2. Commits are analyzed to determine version bump
3. CHANGELOG.md is updated automatically
4. Package is published to npm
5. GitHub release is created

### Conventional Commits

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

| Type | Version Bump | Example |
|------|--------------|---------|
| `fix` | Patch (1.0.x) | `fix(cli): handle empty input` |
| `feat` | Minor (1.x.0) | `feat(prd): add export command` |
| `feat!` or `BREAKING CHANGE:` | Major (x.0.0) | `feat!: change config format` |

Other types (`docs`, `chore`, `refactor`, `test`, `ci`) don't trigger releases.

## License

MIT
