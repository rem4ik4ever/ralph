# PRD: Streamline PRD Workflow

**Date:** 2026-01-18

---

## Problem Statement

### What problem are we solving?
Creating and executing PRDs requires 6 manual steps with context switching between Claude Code and CLI. User must:
1. Run `/ralph-prd` skill
2. Skill writes PRD markdown
3. Manually run `ralph prd add prd.md name`
4. Manually run `ralph run name`
5. Wait for iterations
6. Relaunch Claude for tweaks

Steps 2→3→4 have friction. Skill writes PRD but user must manually register it. Additionally, `prd add` fails if directory exists (skill creates it when writing).

### Why now?
Core workflow friction. Every PRD creation hits this.

### Who is affected?
- **Primary users:** Developers using ralph + Claude Code for feature development

---

## Proposed Solution

### Overview
Make `ralph prd add` smarter about existing files, and update the skill transformation to auto-register PRDs after creation. Reduces workflow from 6 steps to 2-3.

---

## End State

When this PRD is complete:

- [ ] `ralph prd add` handles existing prd.md without error (skill-created PRDs work)
- [ ] `ralph prd add` prompts before overriding fully-registered PRDs
- [ ] `ralph-prd` skill auto-registers after writing PRD
- [ ] `ralph-prd` skill prompts user to start execution
- [ ] Existing `prd add` behavior preserved for external markdown files

---

## Acceptance Criteria

### Feature: Smart `prd add` existence handling
- [ ] If only `prd.md` exists (no json/progress): skip copy, proceed with conversion
- [ ] If `prd.md` + `prd.json` + `progress.txt` all exist: prompt user to override
- [ ] If nothing exists: original behavior (copy + convert)
- [ ] External markdown path still works (copies to .ralph/prd/)

### Feature: Skill transformation adds post-creation steps
- [ ] `transformSkillContent()` appends post-creation section
- [ ] Post-creation instructs: run `ralph prd add`, ask user about execution
- [ ] `ralph init` produces skill with post-creation steps

---

## Technical Context

### Existing Patterns
- `src/commands/prd-add.ts:42-46` - current existence check (fails if dir exists)
- `src/init/templates.ts:54-94` - skill content transformation

### Key Files
- `src/commands/prd-add.ts` - main logic change
- `src/init/templates.ts` - append post-creation to skill
- `src/prd/manager.ts` - `prdExists()` helper (may need file-level checks)

### System Dependencies
- `prompts` package (already used in init.ts for interactive prompts)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing `prd add` flow | Med | High | Test external file path still works |
| Skill transformation breaks on edge cases | Low | Med | Test with various prd skill formats |

---

## Alternatives Considered

### Alternative 1: New `ralph prd register` command
- **Description:** Separate command for skill-created PRDs
- **Pros:** No changes to existing `prd add`
- **Cons:** Two similar commands, user confusion
- **Decision:** Rejected. Smarter `add` is cleaner.

### Alternative 2: Skill writes to temp location first
- **Description:** Skill writes to `/tmp`, then `prd add` moves it
- **Pros:** No changes to `prd add`
- **Cons:** Extra complexity, temp file cleanup
- **Decision:** Rejected. Unnecessary indirection.

---

## Non-Goals (v1)

- Fully automated end-to-end (no user prompts) - want user control over execution start
- Changes to `ralph run` command - works fine as-is
- Changes to prd.json format - not needed

---

## Interface Specifications

### CLI
```
ralph prd add <path> <name> [options]

Behavior changes:
- Detects if .ralph/prd/<name>/prd.md already exists
- If yes and no prd.json: converts in-place (skill scenario)
- If yes and has prd.json + progress.txt: prompts for override
```

---

## Tasks

### Task: Smart existence check [cli]
**Verification:**
- [ ] `prd add` succeeds when only prd.md exists in target dir
- [ ] `prd add` prompts when prd.md + prd.json + progress.txt exist
- [ ] `prd add` with external file still copies to target dir
- [ ] Tests cover all three scenarios

### Task: Skill transformation post-creation [init]
**Verification:**
- [ ] `transformSkillContent()` appends post-creation section
- [ ] Transformed skill contains `ralph prd add` instruction
- [ ] Transformed skill contains prompt about execution
- [ ] `ralph init` in test project produces correct skill

---

## Open Questions

| Question | Owner | Due Date | Status |
|----------|-------|----------|--------|
| None | - | - | - |
