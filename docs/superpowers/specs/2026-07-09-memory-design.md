# Memory System Design

## Goal

Give agents persistent, evolving context across sessions. The harness today
provides static context (rules, stack guidelines, skills). Memory adds dynamic
context: decisions made, constraints discovered, learnings earned, problems
still open.

## Core Principle

Memory is just files. `.seh/memory/<name>.md` committed to the repo — no
generation, no hooks, no external dependencies. `seh sync` surfaces them in
AGENTS.md. Agents are instructed by the harness protocol to write at session
end. Human or agent updates them when things change.

## Scope

**In scope:**
- `.seh/memory/` directory with typed markdown files
- Four memory types: `decision`, `constraint`, `learning`, `problem`
- `seh memory add/list/remove` commands
- `seh sync` renders `## Memory` section in `.seh/AGENTS.md`
- Protocol block in AGENTS.md instructs agents when and what to write

**Out of scope:**
- Global memory (`~/.seh/memory/`) — future feature
- Agent-native memory integration (Claude `MEMORY.md`, etc.)
- Automatic extraction from git history
- Memory search or filtering

## Memory File Format

Each memory file lives at `.seh/memory/<name>.md` and has a frontmatter type
header followed by free-form markdown:

```markdown
---
type: decision
---

# Auth strategy

Chose JWT over sessions. Sessions required sticky routing which complicates
the Docker setup. JWT is stateless and works across all replicas.
```

**Types:**

| Type | When to use |
|------|-------------|
| `decision` | A choice made and why (architecture, tech, approach) |
| `constraint` | A hard rule discovered (never do X, always do Y) |
| `learning` | Something non-obvious that cost time to figure out |
| `problem` | Unresolved issue to pick up next session |

The first H1 heading in the file becomes the display title in the AGENTS.md
index. `decision` is the default type when no flag is given.

## Commands

### `seh memory add <name> [--decision | --constraint | --learning | --problem]`

Creates `.seh/memory/<name>.md` with the correct frontmatter template and opens
`$EDITOR` (falls back to printing the file path if `$EDITOR` is unset). If the
file already exists, opens it directly (no overwrite).
`--decision` is the default type if no flag is provided.

```bash
seh memory add auth-strategy --decision
seh memory add rate-limiting --problem
seh memory add jwt-expiry --learning
seh memory add url-structure --constraint
```

### `seh memory list`

Shows all memory files grouped by type with the first H1 as title:

```
Decisions
  auth-strategy       Chose JWT over sessions
  db-migrations       Use Flyway, not Liquibase

Constraints
  url-structure       Never expose user IDs in URLs

Learnings
  jwt-expiry          Access tokens must be short-lived (<15m) or refresh loop breaks

Open problems
  rate-limiting       Strategy unresolved — Redis vs in-process
```

### `seh memory remove <name>`

Deletes `.seh/memory/<name>.md`. Prompts for confirmation if file exists.

## AGENTS.md Rendered Output

`seh sync` appends a `## Memory` section after `## Skills` (or after
`## Contents` if no skills are configured). The section has two parts:

1. **Protocol block** — always present when `.seh/memory/` exists, instructs
   agents when and what to write
2. **Index** — links to each memory file grouped by type, with first-line title

```markdown
## Memory

Write to `.seh/memory/` at end of every session:
- **decision** — a choice made and why (architecture, tech, approach)
- **constraint** — a hard rule discovered (never do X, always do Y)
- **learning** — something non-obvious that cost time to figure out
- **problem** — unresolved issue to pick up next session

Run: `seh memory add <name> [--decision|--constraint|--learning|--problem]`

### Decisions
- [Auth strategy](.seh/memory/auth-strategy.md) — Chose JWT over sessions
- [DB migrations](.seh/memory/db-migrations.md) — Use Flyway, not Liquibase

### Constraints
- [URL structure](.seh/memory/url-structure.md) — Never expose user IDs in URLs

### Learnings
- [JWT expiry](.seh/memory/jwt-expiry.md) — Access tokens must be short-lived

### Open problems
- [Rate limiting](.seh/memory/rate-limiting.md) — Strategy unresolved
```

**Section omission rules:**
- If `.seh/memory/` is empty or missing: only the protocol block is rendered
  (no index subsections)
- If a type has no files: that subsection is omitted entirely
- If `seh sync` is run with no resolver and no memory files: `## Memory` is
  omitted entirely

## Affected Files

| File | Change |
|------|--------|
| `src/types.ts` | Add `MemoryType` union and `MemoryEntry` type |
| `src/paths.ts` | Add `projectMemoryDir`, `projectMemoryFile` helpers |
| `src/commands/memory.ts` | New file: `runMemoryAdd`, `runMemoryList`, `runMemoryRemove` |
| `src/commands/sync.ts` | `buildProjectIndex` reads `.seh/memory/` and appends `## Memory` |
| `src/index-emitter.ts` | Add `buildMemorySection(entries)` helper |
| `src/cli.ts` | Register `seh memory add/list/remove` command group |
| `test/memory.test.ts` | New file: unit tests for all three commands |
| `test/sync.test.ts` | Add tests for `## Memory` section rendering |
| `test/index-emitter.test.ts` | Add tests for `buildMemorySection` |

## Verification

- `seh memory add auth-strategy --decision` → `.seh/memory/auth-strategy.md` created with correct frontmatter
- `seh memory list` → grouped output by type
- `seh memory remove auth-strategy` → file deleted after confirmation
- `seh sync` with memory files → AGENTS.md contains `## Memory` section
- `seh sync` with empty memory dir → only protocol block rendered
- `seh sync` with no memory dir → `## Memory` omitted
- Protocol block always present when memory dir exists (even if empty)
