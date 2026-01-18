# PRD: Stream Persistence for Iteration Logs

**Date:** 2026-01-17

---

## Problem Statement

### What problem are we solving?
Iteration logs only capture final aggregated output after agent completes. Streamed messages shown in terminal during execution are lost. Users can't:
- Debug issues that occurred mid-stream
- Replay iterations exactly as displayed
- See partial progress when agent was interrupted

### Why now?
Current logging captures `textOutput` post-completion only. Any interruption (ctrl+c, crash, error) loses all streamed content.

### Who is affected?
- **Primary users:** Developers debugging failed/interrupted runs
- **Secondary users:** Anyone reviewing past iterations for context

---

## Proposed Solution

### Overview
Persist streamed messages incrementally as they arrive, matching terminal display. Track interruption state (completion, user abort, crash) in log metadata.

### Architecture

```
Claude CLI (stdout)
    ↓ NDJSON chunks
NDJSONParser
    ↓ parsed events
formatEvent()
    ↓
┌───────────────────────────────┐
│  StreamPersister (new)        │
│  - Appends to .log on each    │
│    formatted message          │
│  - Tracks interruption state  │
│  - Flushes on completion/exit │
└───────────────────────────────┘
    ↓
Terminal (unchanged)
```

---

## End State

When this PRD is complete:

- [ ] Streamed messages persist incrementally to iteration logs
- [ ] Log content matches what was shown in terminal at time of write
- [ ] Interruption state (completed/aborted/crashed) stored in log metadata
- [ ] Partial logs preserved on ctrl+c, SIGTERM, SIGHUP, uncaught exceptions
- [ ] Tests cover incremental writes and interruption scenarios
- [ ] Existing log reading/replay tools work with new format

---

## Success Metrics

### Quantitative
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Content captured on interrupt | 0% | 100% | Manual test: ctrl+c mid-stream |
| Log write latency | N/A (batch) | <10ms per chunk | Benchmark |

### Qualitative
- Logs readable for debugging interrupted runs
- No user-visible latency increase during streaming

---

## Acceptance Criteria

### Incremental Persistence
- [ ] Each formatted event appends to log file immediately
- [ ] Writes are atomic (no partial lines on crash)
- [ ] File handle managed efficiently (no open/close per write)
- [ ] Buffer flushes on each complete event OR every 100ms (whichever first)
- [ ] stderr captured inline with `[stderr]` prefix (preserves chronological order)

### Interruption Tracking
- [ ] Log header includes `status: completed | aborted | crashed | in_progress`
- [ ] SIGINT (ctrl+c) sets status to `aborted`
- [ ] SIGTERM, SIGHUP set status to `aborted`
- [ ] Uncaught exceptions set status to `crashed`
- [ ] Normal completion sets status to `completed`
- [ ] Active log has status `in_progress` until finalized

### Log Format
- [ ] Maintains backward compatibility with existing log structure
- [ ] Adds metadata section for status and interruption info
- [ ] Assembled text format (not raw NDJSON chunks)

### Error Handling
- [ ] Write errors logged but don't crash agent
- [ ] Disk full handled gracefully
- [ ] Concurrent iteration writes don't conflict

---

## Technical Context

### Existing Patterns
- `src/agents/claude.ts:31-50` - NDJSONParser event handling, where persistence hook should attach
- `src/agents/claude-formatter.ts` - formatEvent() produces display strings to persist
- `src/commands/run.ts:109-126` - Current post-completion log writing

### Key Files
- `src/agents/claude.ts` - Add persistence callback alongside onOutput
- `src/commands/run.ts` - Instantiate StreamPersister, handle signals
- `src/utils/ndjson.ts` - Reference for incremental parsing pattern

### System Dependencies
- Node.js fs (appendFile or write stream)
- Process signal handlers (SIGINT, SIGTERM, SIGHUP)
- process.on('uncaughtException') for crash handling

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Disk I/O slows streaming | Med | Med | Buffer writes, flush on interval or event boundary |
| Signal handler conflicts | Low | High | Use addListener, don't replace existing handlers |
| Partial writes on crash | Med | Low | Use atomic append or temp file + rename |
| Large logs from verbose output | Med | Low | Consider rotation or size limits (future) |

---

## Alternatives Considered

### Alternative 1: Store raw NDJSON events
- **Pros:** Lossless, can replay exact event sequence
- **Cons:** Not human-readable, larger files, requires parser to view
- **Decision:** Rejected. User wants assembled text matching terminal display.

### Alternative 2: Buffer and write on completion only (current)
- **Pros:** Simple, single write
- **Cons:** Loses everything on interrupt
- **Decision:** Rejected. Core problem this PRD solves.

### Alternative 3: SQLite for structured storage
- **Pros:** Queryable, handles concurrent writes
- **Cons:** Overhead, harder to inspect manually, new dependency
- **Decision:** Rejected. Text files sufficient, keep simple.

---

## Non-Goals (v1)

- Log rotation/size limits - defer until logs prove too large
- Replay/playback feature - just capture data, replay is separate
- Raw NDJSON event storage - assembled text only per requirements
- Compression - defer, keep human-readable

---

## Interface Specifications

### Log File Format (Updated)
```markdown
# Iteration {n}
Timestamp: {ISO}
Status: in_progress | completed | aborted | crashed
Duration: {ms}ms (only on completion)
Exit Code: {code} (only on completion)
Interrupted: {signal} (only if aborted/crashed)
---

{streamed content as it appeared in terminal}
```

### StreamPersister API
```typescript
interface StreamPersisterOptions {
  logPath: string
  flushIntervalMs?: number  // default: 100
}

interface StreamPersister {
  constructor(options: StreamPersisterOptions)

  // Called for each formatted event - buffers internally
  append(content: string): Promise<void>

  // Called for stderr - prefixes with [stderr] and appends
  appendStderr(content: string): Promise<void>

  // Force flush buffer to disk
  flush(): Promise<void>

  // Called on normal completion
  complete(exitCode: number, duration: number): Promise<void>

  // Called on interruption (SIGINT, SIGTERM, SIGHUP)
  abort(signal: string): Promise<void>

  // Called on crash (uncaughtException)
  crash(error: Error): Promise<void>
}
```

### Buffering Strategy
- Internal buffer accumulates content from `append()` calls
- Auto-flush triggers:
  1. On each complete event (after `append()` for event boundary)
  2. Every 100ms via interval timer
  3. On `complete()`, `abort()`, or `crash()`
- Timer cleared on finalization to prevent leaks

---

## Open Questions

| Question | Owner | Due Date | Status |
|----------|-------|----------|--------|
| ~~Should we capture stderr separately or inline?~~ | - | - | Resolved: Inline with `[stderr]` prefix |
| ~~Buffer size/flush interval for performance?~~ | - | - | Resolved: Flush per event OR every 100ms |

---

## Appendix

### Current Log Format Reference
```markdown
# Iteration {iteration}
Timestamp: {ISO timestamp}
Duration: {milliseconds}ms
Exit Code: {exit code}
---

{output content}
```

### Signal Reference
- SIGINT (2): ctrl+c
- SIGTERM (15): kill command default
- SIGHUP (1): terminal closed
