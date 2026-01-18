---
name: ralph
description: CLI tool for running AI agents in loops with PRD-driven task execution. Use to understand ralph commands, PRD lifecycle, and file structure.
---

# Ralph CLI

Ralph runs AI agents headlessly in loops, executing tasks from structured PRDs.

## Commands

### `ralph init`

Initialize ralph in the current project. Creates `.ralph/` directory and installs Claude Code skills.

```bash
ralph init
```

### `ralph prd add <path> <name>`

Register a PRD markdown file. Runs an agent to convert markdown to structured JSON.

```bash
ralph prd add .ralph/prd/my-feature/prd.md my-feature
```

Options:
- `-a, --agent <agent>` - Agent to use (default: `claude`)

Creates:
- `.ralph/prd/<name>/prd.json` - Structured task definitions
- `.ralph/prd/<name>/progress.txt` - Empty progress file

### `ralph prd list`

List all registered PRDs with status.

```bash
ralph prd list
```

Output columns:
- NAME - PRD identifier
- DESCRIPTION - First task description
- STATUS - pending | in_progress | completed
- PROGRESS - tasks completed / total
- LOCATION - local | global

### `ralph prd info <name>`

Show PRD details and file locations.

```bash
ralph prd info my-feature
```

Example output:
```
PRD: my-feature
Status: in_progress (3/7 tasks complete)

Files:
  prd.md:      .ralph/prd/my-feature/prd.md
  prd.json:    .ralph/prd/my-feature/prd.json
  progress:    .ralph/prd/my-feature/progress.txt
  iterations:  .ralph/prd/my-feature/iterations/ (2 files)
```

### `ralph prd delete <name>`

Delete a PRD and all associated files.

```bash
ralph prd delete my-feature
ralph prd delete my-feature --force  # skip confirmation
```

Options:
- `-f, --force` - Skip confirmation prompt

### `ralph run <prd-name>`

Execute PRD tasks in a loop. Agent completes tasks sequentially.

```bash
ralph run my-feature
ralph run my-feature --iterations 6
```

Options:
- `-a, --agent <agent>` - Agent to use (default: `claude`)
- `-i, --iterations <n>` - Loop iterations (default: `4`)

## PRD Lifecycle

1. **Create** - Write PRD markdown in `.ralph/prd/<name>/prd.md`
2. **Register** - `ralph prd add <path> <name>` converts to JSON
3. **Execute** - `ralph run <name>` runs agent loop

## File Structure

```
.ralph/
├── config.json          # Project configuration
└── prd/
    └── <prd-name>/
        ├── prd.md       # Original PRD markdown
        ├── prd.json     # Structured tasks (auto-generated)
        ├── progress.txt # Implementation notes
        └── iterations/  # Agent session logs
```

### prd.json Structure

```json
{
  "prdName": "feature-name",
  "tasks": [
    {
      "id": "task-1",
      "category": "setup",
      "description": "What to do",
      "steps": ["Step 1", "Step 2"],
      "passes": false
    }
  ],
  "context": {
    "patterns": ["Pattern to follow"],
    "keyFiles": ["src/relevant/file.ts"],
    "nonGoals": ["What NOT to do"]
  }
}
```

Note: `context` is optional and generated from the PRD's Technical Context section.

### progress.txt Format

```markdown
## Codebase Patterns
- Discovered pattern 1
- Discovered pattern 2

## Task - task-1
- What was implemented
- Files changed
- **Learnings:** patterns, gotchas
```

## Common Workflows

### Start New Feature

```bash
# 1. Create PRD (use ralph-prd skill or manually)
mkdir -p .ralph/prd/my-feature
# Write prd.md

# 2. Register
ralph prd add .ralph/prd/my-feature/prd.md my-feature

# 3. Execute
ralph run my-feature
```

### Check Progress

```bash
ralph prd list           # Overview of all PRDs
ralph prd info my-feature # Details for specific PRD
```

### Clean Up

```bash
ralph prd delete old-feature
```

## Location Priority

Ralph checks local (`.ralph/prd/`) before global (`~/.ralph/prd/`). Local PRDs take precedence if both exist with the same name.
