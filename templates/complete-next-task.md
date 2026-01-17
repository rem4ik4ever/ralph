# Complete Next Task

Complete the next incomplete task from a PRD.

## Context

- PRD Name: `$PRD_NAME`
- PRD Path: `$PRD_PATH`
- PRD Markdown: `$PRD_MD_PATH`
- Working Directory: `$CWD`

## Process

### 1. Get Bearings

- Read progress file at `$PRD_PATH/../progress.txt` - check "Codebase Patterns" section first
- Read PRD markdown at `$PRD_MD_PATH` for full context and intent
- Read PRD JSON at `$PRD_PATH` - find next task with `passes: false`
- Check recent git history: `git log --oneline -10`

### 2. Branch Setup

If not on the `$PRD_NAME` branch:
- `git checkout $PRD_NAME` (or `git checkout -b $PRD_NAME` if new)

### 3. Implement Task

Work on the single task. Follow steps in the task definition.

### 4. Feedback Loops (REQUIRED)

Before committing, run ALL applicable:
- Type checking
- Tests
- Linting
- Formatting

Do NOT commit if any fail. Fix issues first.

### 5. Update PRD

Set the completed task's `passes` field to `true` in the PRD file.

### 6. Update Progress

Append to progress.txt:

```markdown
## Task - [task.id]
- What was implemented
- Files changed
- **Learnings:** patterns, gotchas
```

If you discover a reusable pattern, also add to `## Codebase Patterns` at the top.

### 7. Commit

```bash
git add -A && git commit -m 'feat(<scope>): <description>'
```

## Completion

If all tasks have `passes: true`, output:

```
<tasks>COMPLETE</tasks>
```

## Philosophy

This codebase will outlive you. Every shortcut becomes someone else's burden. Patterns you establish will be copied. Corners you cut will be cut again.

Fight entropy. Leave the codebase better than you found it.
