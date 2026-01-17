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
