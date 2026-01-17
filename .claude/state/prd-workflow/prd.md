# PRD: PRD-Based Task Tracking for Ralph CLI

**Date:** 2026-01-16

---

## Problem Statement

### What problem are we solving?
Ralph CLI currently runs agents with raw prompt files, lacking structured task tracking. Users cannot:
- Track which tasks are complete vs pending
- Maintain progress across agent iterations
- View status of multiple ongoing projects

This makes long-running agent workflows opaque and hard to manage.

### Why now?
Based on Anthropic's research on effective harnesses for long-running agents. Structured task tracking with verification steps improves agent reliability and user visibility.

### Who is affected?
- **Primary users:** Developers running headless agent loops for multi-step implementations
- **Secondary users:** Teams wanting visibility into agent progress on features

---

## Proposed Solution

### Overview
Add PRD workflow to Ralph: convert markdown PRDs to trackable JSON tasks, run loops against PRDs with progress tracking, and provide visibility into task completion status.

### User Experience

#### User Flow: Add PRD
1. User creates markdown PRD with tasks and verification steps
2. User runs `ralph prd add prd.md my-feature`
3. Agent converts markdown to JSON, stores in ~/.ralph/prd/my-feature/
4. User sees summary of task count by category

#### User Flow: Run PRD
1. User runs `ralph run my-feature`
2. Agent picks up first incomplete task, implements it
3. Agent runs feedback loops (tests, lint, types)
4. Agent marks task passed, updates progress.txt
5. Loop continues until all tasks pass or max iterations

#### User Flow: Check Status
1. User runs `ralph prd list`
2. Sees all PRDs with status: Pending, In Progress, Completed
3. Shows task completion ratio (e.g., 3/7)

---

## End State

When this PRD is complete, the following will be true:

- [ ] `ralph prd add <path> <name>` converts markdown PRD to JSON
- [ ] `ralph prd list` shows all PRDs with status
- [ ] `ralph run <prd-name>` executes agent loop against PRD
- [ ] Agent updates prd.json passes field on task completion
- [ ] Agent maintains progress.txt with learnings across iterations
- [ ] Iteration logs stored per-PRD in ~/.ralph/prd/<name>/iterations/
- [ ] Old `ralph run <prompt-files>` syntax removed
- [ ] All new code has test coverage
- [ ] Templates stored in ~/.ralph/templates/ and customizable

---

## Success Metrics

### Quantitative
| Metric | Current | Target | Measurement Method |
|--------|---------|--------|-------------------|
| Task completion visibility | 0% | 100% | PRD status shows pass/fail per task |
| Cross-iteration memory | None | Full | progress.txt persists learnings |

### Qualitative
- Users can leave agent running and check status later
- Teams can share PRD progress across members

---

## Acceptance Criteria

### Feature: PRD Add Command
- [ ] Validates markdown file exists
- [ ] Creates ~/.ralph/prd/<name>/ folder structure
- [ ] Copies markdown to prd.md
- [ ] Calls agent with prd-md-to-json template
- [ ] Validates prd.json created and matches schema
- [ ] Creates empty progress.txt
- [ ] Prints summary with task count by category

### Feature: PRD List Command
- [ ] Scans ~/.ralph/prd/*/
- [ ] Reads prd.json for each, computes status
- [ ] Shows "pending" when 0 tasks passed
- [ ] Shows "in_progress" when some tasks passed
- [ ] Shows "completed" when all tasks passed
- [ ] Handles missing prd.json gracefully

### Feature: Run Command (PRD Mode)
- [ ] Accepts `ralph run <prd-name>` syntax
- [ ] Validates PRD exists in ~/.ralph/prd/
- [ ] Loads complete-next-task.md template
- [ ] Substitutes $PRD_NAME, $PRD_PATH, $CWD variables
- [ ] Saves iteration logs to ~/.ralph/prd/<name>/iterations/
- [ ] Stops on `<tasks>COMPLETE</tasks>` marker
- [ ] Old prompt-files syntax removed

### Feature: Template System
- [ ] Templates stored in ~/.ralph/templates/
- [ ] Default templates copied on first use if missing
- [ ] prd-md-to-json.md template for conversion
- [ ] complete-next-task.md template for run loop

---

## Technical Context

### Existing Patterns
- CLI commands: `src/commands/<name>.ts` - Commander.js action handlers
- Tests: `src/__tests__/<module>/<name>.test.ts` - Vitest with mocking
- Agent interface: `src/agents/base.ts` - execute() returns AgentResult
- Session manager: `src/session/manager.ts` - creates folders, writes logs

### Key Files
- `src/index.ts` - CLI entry point, command registration
- `src/commands/run.ts` - Current run command (to be rewritten)
- `src/session/manager.ts` - Pattern for folder management
- `src/agents/claude.ts` - Agent execution pattern

### System Dependencies
- commander.js for CLI parsing
- nanoid for unique IDs
- vitest for testing
- Node.js fs/promises for file operations

### Data Model Changes

**PRD Folder Structure:**
```
~/.ralph/prd/<name>/
├── prd.md        # Original markdown
├── prd.json      # Converted JSON with tasks
├── progress.txt  # Cross-iteration memory
└── iterations/   # Iteration logs
    ├── 0.json
    └── ...
```

**prd.json Schema:**
```typescript
interface PrdJson {
  prdName: string
  tasks: PrdTask[]
  context: {
    patterns: string[]
    keyFiles: string[]
    nonGoals: string[]
  }
}

interface PrdTask {
  id: string
  category: string
  description: string
  steps: string[]      // Verification steps
  passes: boolean      // Set to true when complete
}
```

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Agent produces invalid JSON | Medium | Medium | Validate schema after conversion, retry on failure |
| Template changes break existing PRDs | Low | High | Version templates, don't auto-update user templates |
| Agent fails to update prd.json | Medium | Medium | Verify passes field changed after each iteration |
| Progress.txt grows too large | Low | Low | Agent consolidates patterns, older logs can be archived |

---

## Alternatives Considered

### Alternative 1: Database for task tracking
- **Description:** Use SQLite to store PRD state
- **Pros:** Structured queries, atomic updates
- **Cons:** Added dependency, harder to inspect manually
- **Decision:** Rejected. JSON files are simpler, human-readable, git-friendly.

### Alternative 2: Keep prompt-files mode alongside PRD
- **Description:** Support both `ralph run <files>` and `ralph run <prd-name>`
- **Pros:** Backwards compatible
- **Cons:** Maintenance burden, confusing UX
- **Decision:** Rejected. Clean break to PRD-only simplifies codebase.

---

## Non-Goals (v1)

Explicitly out of scope for this PRD:
- Multiple VCS support (jj) - git only for now
- Manual PRD parsing - agent does conversion
- PRD editing commands - users edit files directly
- Cloud sync of PRDs - local ~/.ralph only
- PRD templates/scaffolding - users write markdown manually

---

## Interface Specifications

### CLI

```
ralph prd add <path> <name> [options]
  Convert markdown PRD to JSON and store in ~/.ralph/prd/<name>/

  Arguments:
    path    Path to markdown PRD file
    name    Name for the PRD (used as folder name)

  Options:
    --agent <agent>    Agent to use for conversion (default: claude)

ralph prd list
  List all PRDs with their status

  Output format:
    1. <name> - <description> - <status> (<passed>/<total>)

ralph run <prd-name> [options]
  Run agent loop against a PRD

  Arguments:
    prd-name    Name of PRD in ~/.ralph/prd/

  Options:
    --agent <agent>        Agent to use (default: claude)
    --iterations <n>       Max iterations (default: 4)
```

---

## Documentation Requirements

- [ ] Update README with PRD workflow
- [ ] Add examples of PRD markdown format
- [ ] Document template customization

---

## Open Questions

| Question | Owner | Due Date | Status |
|----------|-------|----------|--------|
| Should templates be per-agent or shared? | - | - | Open |

---

## Appendix

### complete-next-task.md Template

```markdown
Complete one task from a PRD file. Implements the next task with passes: false, runs feedback loops, and commits.

## File Locations

State directory: ~/.ralph/prd/$PRD_NAME/
├── prd.json       # Task list with passes field
└── progress.txt   # Cross-iteration memory

## Process

### 1. Get Bearings
- Read progress.txt - CHECK 'Codebase Patterns' SECTION FIRST
- Read prd.json - find next task with passes: false
- Task Priority: Architecture → Integration → Spikes → Features → Polish
- Check recent history (git log --oneline -10)

### 2. Initialize Progress (if needed)
Create progress.txt with Codebase Patterns section if missing.

### 3. Branch Setup
git checkout -b $PRD_NAME (or checkout if exists)

### 4. Implement Task
Work on the single task until verification steps pass.

### 5. Feedback Loops (REQUIRED)
Before committing, run ALL applicable: type checking, tests, linting, formatting.
Do NOT commit if any fail.

### 6. Update PRD
Set the task's passes field to true in prd.json.

### 7. Update Progress
Append task summary to progress.txt. Add reusable patterns to Codebase Patterns section.

### 8. Commit
git add -A && git commit -m 'feat(<scope>): <description>'

## Completion

If all tasks have passes: true, output:
<tasks>COMPLETE</tasks>

---
PRD Name: $PRD_NAME
Working Directory: $CWD
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/prd/types.ts` | Type definitions |
| `src/prd/manager.ts` | PRD CRUD operations |
| `src/prd/templates.ts` | Template loading/init |
| `src/prd/index.ts` | Exports |
| `src/commands/prd/add.ts` | Add command |
| `src/commands/prd/list.ts` | List command |
| `src/commands/prd/index.ts` | Command registration |
| `src/templates/prd-md-to-json.md` | Conversion template |
| `src/templates/complete-next-task.md` | Run loop template |

### Files to Modify

| File | Changes |
|------|---------|
| `src/index.ts` | Register prd command group, update run |
| `src/commands/run.ts` | Rewrite for PRD-only mode |
| `src/utils/files.ts` | Remove old COMPLETION_MARKER |
