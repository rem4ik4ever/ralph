# Ralph

Loop coding agent CLI - run AI coding agents headlessly in a loop.

Inspired by [Geoff Huntley's ralph technique](https://ghuntley.com/ralph/) - putting a coding agent in a while loop and letting it work autonomously.

```bash
while :; do cat prompt.md | claude -p; done
```

Ralph wraps this pattern into a proper CLI with session logging, iteration limits, and automatic task completion detection.

## Installation

```bash
# npm
npm install -g rlph-cli

# or run directly
npx rlph-cli run -p "your task"
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

```bash
ralph run -p <prompt> [-a agent] [-i iterations]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --prompt <files...>` | Prompt text or files to pass to agent | required |
| `-a, --agent <agent>` | Agent type (currently: claude) | `claude` |
| `-i, --iterations <n>` | Max loop iterations | `4` |

### Examples

**Simple task**
```bash
ralph run -p "fix the login bug" -i 3
```

**Using a prompt file**
```bash
ralph run -p prompt.md -i 10
```

**Multiple prompts/files**
```bash
ralph run -p task.md context.md "also add tests"
```

**Long running task**
```bash
ralph run -p "port this codebase from React to Vue" -i 50
```

## How it works

1. Ralph reads your prompt (text or files)
2. Appends completion instructions asking agent to output `<ralph>RALPH_COMPLETED</ralph>` when done
3. Runs the agent in a loop up to N iterations
4. Streams output in real-time
5. Stops early if agent signals completion
6. Logs each iteration to `~/.ralph/sessions/<session-id>/`

## Session logs

All sessions are logged to `~/.ralph/sessions/`:

```
~/.ralph/sessions/
  └── <session-id>/
      ├── meta.json    # session metadata
      ├── 0.log        # iteration 0 output
      ├── 1.log        # iteration 1 output
      └── ...
```

## Supported agents

- `claude` - Claude Code CLI (requires [claude](https://claude.ai/claude-code) installed)

## Requirements

- Node.js >= 18
- Claude Code CLI installed and authenticated

## License

MIT
