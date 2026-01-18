# PRD: Ralph CLI Enhancements

**Date:** 2026-01-18

---

## Problem Statement

### What problem are we solving?

AI agents using ralph lack discoverability for PRD artifacts. When running `ralph prd <name>`, there's no output showing where prd.md, prd.json, and progress.txt live. Agents must guess paths or explore filesystem.

Additionally, no way to delete PRDs. Once created, cleanup requires manual filesystem operations.

Finally, users need guidance on ralph CLI usage. A skill template describing all commands would help AI agents understand the full workflow.

### Why now?

Active development on ralph CLI. These gaps became apparent during dogfooding.

### Who is affected?

- **Primary:** AI agents (Claude, Codex, OpenCode) executing PRDs
- **Secondary:** Developers using ralph for project management

---

## Proposed Solution

### Overview

Three enhancements:
1. `ralph prd <name>` - Info command showing file locations and status
2. `ralph prd delete <name>` - Remove PRD and all associated files
3. `ralph-skill` template - Claude Code skill describing ralph CLI usage

### CLI Interface

#### 1. `ralph prd <name>` (Info Command)

```
$ ralph prd my-feature

PRD: my-feature
Status: in_progress (3/7 tasks complete)

Files:
  prd.md:      .ralph/prd/my-feature/prd.md
  prd.json:    .ralph/prd/my-feature/prd.json
  progress:    .ralph/prd/my-feature/progress.txt
  iterations:  .ralph/prd/my-feature/iterations/
```

If PRD doesn't exist:
```
$ ralph prd nonexistent

Error: PRD 'nonexistent' not found
```

If partial (only prd.md):
```
$ ralph prd my-feature

PRD: my-feature
Status: partial (not registered)

Files:
  prd.md:      .ralph/prd/my-feature/prd.md
  prd.json:    (not created - run 'ralph prd add')
  progress:    (not created)
```

#### 2. `ralph prd delete <name>`

```
$ ralph prd delete my-feature

Delete PRD 'my-feature'? This will remove:
  - .ralph/prd/my-feature/prd.md
  - .ralph/prd/my-feature/prd.json
  - .ralph/prd/my-feature/progress.txt
  - .ralph/prd/my-feature/iterations/ (2 files)

Confirm? [y/N] y

Deleted PRD 'my-feature'
```

With `--force` flag, skip confirmation:
```
$ ralph prd delete my-feature --force
Deleted PRD 'my-feature'
```

#### 3. `ralph-skill` Template

A Claude Code skill that describes ralph CLI usage. Installed to `~/.claude/skills/ralph-skill/SKILL.md` during `ralph init`.

Content covers:
- All ralph commands and their purposes
- PRD lifecycle (create → add → run)
- File locations and structure
- Common workflows

---

## End State

When this PRD is complete:

- [ ] `ralph prd <name>` displays file paths and status
- [ ] `ralph prd delete <name>` removes PRD and all files
- [ ] `ralph-skill` template exists in templates/
- [ ] `ralph init` installs ralph-skill to ~/.claude/skills/
- [ ] All commands have test coverage
- [ ] --help text documents new commands

---

## Success Metrics

### Quantitative

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| PRD discoverability | 0 (no info command) | 100% | Info command exists |
| Cleanup capability | Manual | Automated | Delete command exists |

### Qualitative

- AI agents can locate PRD files without filesystem exploration
- Users can clean up stale PRDs easily

---

## Acceptance Criteria

### Feature: `ralph prd <name>` Info Command

- [ ] Shows PRD name and computed status
- [ ] Lists all file paths (prd.md, prd.json, progress.txt, iterations/)
- [ ] Indicates missing files for partial PRDs
- [ ] Errors gracefully if PRD doesn't exist
- [ ] Works for both local and global PRDs

### Feature: `ralph prd delete <name>`

- [ ] Prompts for confirmation by default
- [ ] `--force` flag skips confirmation
- [ ] Removes entire PRD directory (prd.md, prd.json, progress.txt, iterations/)
- [ ] Errors gracefully if PRD doesn't exist
- [ ] Works for both local and global PRDs

### Feature: `ralph-skill` Template

- [ ] Template file exists at `templates/ralph-skill.md`
- [ ] Describes all ralph commands
- [ ] Covers PRD lifecycle workflow
- [ ] Documents file structure
- [ ] `ralph init` copies to `~/.claude/skills/ralph-skill/SKILL.md`

---

## Technical Context

### Existing Patterns

- Command structure: `src/commands/prd-add.ts`, `src/commands/prd-list.ts`
- PRD manager functions: `src/prd/manager.ts` (`getPrdDir`, `getPrdFileStatus`, `listPrds`)
- Skill installation: `src/init/skills.ts` (`installClaudeSkills`)
- Template loading: `src/templates/templates.ts`

### Key Files

- `src/commands/prd-add.ts` - Pattern for PRD subcommands
- `src/prd/manager.ts` - File location/status logic
- `src/init/skills.ts` - Skill installation during init
- `templates/ralph-prd-skill.md` - Existing skill template pattern

### System Dependencies

- `commander` library for CLI
- `fs/promises` for file operations
- `readline` for confirmation prompts

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Delete removes wrong files | Low | High | Explicit confirmation, list files before delete |
| Path confusion (local vs global) | Med | Med | Show full paths in info output |

---

## Alternatives Considered

### Alternative: Single `ralph prd` command with subcommands vs positional arg

- **Description:** Use `ralph prd info <name>` instead of `ralph prd <name>`
- **Pros:** More explicit
- **Cons:** Extra typing; `ralph prd <name>` is more intuitive
- **Decision:** Rejected. Positional arg feels natural for "show me this PRD"

---

## Non-Goals (v1)

- PRD rename/move functionality - separate enhancement
- PRD export to other formats - not requested
- Bulk delete operations - single PRD delete sufficient

---

## Interface Specifications

### CLI

```
ralph prd <name>
  Display PRD info including file locations and status

ralph prd delete <name> [--force]
  Delete PRD and all associated files
  Options:
    --force    Skip confirmation prompt

ralph prd add <path> <name>    # existing
ralph prd list                  # existing
```

---

## Open Questions

None.
