# PRD: Fix Local/Global PRD Resolution

**Date:** 2026-01-17

---

## Problem Statement

### What problem are we solving?

The `ralph init` command introduced local PRD storage (`.ralph/prd/`) alongside global (`~/.ralph/prd/`), but the resolution logic is broken:

1. **New PRDs always go global**: `createPrdFolder()` calls `getPrdDir()` which checks if local dir exists. For new PRDs, local never exists, so it always returns global path—even when `.ralph/` is initialized.

2. **No local override possible**: `prdExists()` checks both locations, blocking creation if name exists globally. Users can't create a local version of a global PRD.

3. **Semantic confusion**: Functions check existence to determine location, but existence-based logic fails for creation operations.

### Why now?

Just shipped in commit e19e979. The feature is broken before anyone relies on it.

### Who is affected?

- **Primary users:** Developers using `ralph init` to set up project-local PRDs
- **Secondary users:** Anyone expecting local `.ralph/prd/` to take precedence

---

## Proposed Solution

### Overview

Explicit location resolution with "local-first" semantics: when `.ralph/` exists in cwd, operations target local by default. Global is fallback when no local context exists.

### Resolution Rules

| Operation | Behavior |
|-----------|----------|
| **Create PRD** | Local if `.ralph/` exists, else global |
| **Read PRD** | Local if exists, else global (current behavior, correct) |
| **List PRDs** | Merge both, local shadows global by name |
| **Check exists** | True if in either location |

---

## End State

When this PRD is complete:

- [ ] `createPrdFolder()` creates in local when `.ralph/` exists
- [ ] `getPrdDir()` has explicit `location` parameter for write operations
- [ ] `prdExists()` optionally accepts `location` to check specific location
- [ ] `listPrds()` shows location indicator (local/global)
- [ ] Error handling distinguishes ENOENT from EACCES
- [ ] Tests cover local-first creation and shadowing behavior

---

## Acceptance Criteria

### PRD Creation (local-first)

- [ ] `ralph prd add` in initialized project creates PRD in `.ralph/prd/<name>/`
- [ ] `ralph prd add` in non-initialized project creates PRD in `~/.ralph/prd/<name>/`
- [ ] Creating PRD with same name as global PRD succeeds (local override)

### PRD Resolution (local shadows global)

- [ ] `ralph run <name>` uses local PRD if exists, else global
- [ ] `ralph prd list` shows both local and global PRDs
- [ ] Local PRD with same name as global hides global from list

### Error Handling

- [ ] EACCES on read surfaces as permission error, not "not found"
- [ ] JSON parse errors surface with file path context

---

## Technical Context

### Existing Patterns

- `dirExists()` helper at `src/prd/manager.ts:26-33` - reuse for checks
- Local/global path helpers already exist (`getLocalPrdDir`, `getGlobalPrdDir`)

### Key Files

- `src/prd/manager.ts` - Core resolution logic, main changes here
- `src/commands/prd-add.ts:35` - Calls `getPrdDir()` for new PRDs
- `src/commands/run.ts:37` - Calls `getPrdDir()` for execution
- `src/commands/init.ts:92` - `ralphDirExists()` check pattern

### Proposed API Changes

```typescript
// Current (broken)
export async function getPrdDir(name: string): Promise<string>
export async function createPrdFolder(name: string): Promise<void>

// Proposed
type PrdLocation = 'local' | 'global' | 'auto'

export async function getPrdDir(
  name: string,
  mode: 'read' | 'write' = 'read'
): Promise<string>

export async function createPrdFolder(
  name: string,
  location?: PrdLocation  // default 'auto' = local if .ralph/ exists
): Promise<void>

export async function isProjectInitialized(): Promise<boolean>
```

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing global PRDs | Low | Med | Global remains fallback, no migration needed |
| Confusion about which PRD is active | Med | Low | `prd list` shows location column |

---

## Alternatives Considered

### Alternative 1: Always require explicit --local/--global flag

- **Pros:** No ambiguity
- **Cons:** Verbose for common case, bad DX
- **Decision:** Rejected. Auto-detect is friendlier.

### Alternative 2: Separate commands for local vs global

- **Pros:** Clear separation
- **Cons:** Doubles command surface area
- **Decision:** Rejected. Single command with smart defaults is cleaner.

---

## Non-Goals (v1)

- PRD migration tool (copy global to local) - future enhancement
- Config option to change default location - unnecessary complexity
- Nested `.ralph/` detection (monorepo support) - separate feature

---

## Open Questions

| Question | Status |
|----------|--------|
| Should `prd list` show `[local]`/`[global]` prefix or separate column? | Open |
