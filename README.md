# se-harness

Portable, tool-agnostic AI coding harness generator. One source of truth,
`AGENTS.md` as the entrypoint, no vendor lock-in.

`seh` produces the context files that AI coding agents (Claude Code, Codex,
Cursor, OpenCode, …) read: a **single global ruleset** on your machine plus a
**per-project index** of focused, technology-specific guideline modules.

## Layers

| Layer | Location | What it is |
|-------|----------|------------|
| **L0 — Core** | bundled in the CLI | The authored source content (global sections + per-technology catalog). |
| **L1 — Global** | `~/.seh/` | A **single unified `AGENTS.md`** with your cross-cutting rules. Authored once per machine; optional tool symlinks. Not copied into repos. |
| **L2 — Project** | `<repo>/AGENTS.md` + `.seh/` | A **thin index** linking project + per-technology modules. Committed to the repo. |

Global rules apply everywhere; project layers **extend — never contradict** them.

**Generated files must NOT be hand-edited.** Edit the `.seh/` sources and run
`seh sync` to regenerate.

## The two shapes of `AGENTS.md`

- **Global (`~/.seh/AGENTS.md`) is one self-contained file** — every guardrail
  inlined in a single document, led by a forced **Craftsmanship** principle
  (keep it small and sharp, write elegant code, seek the most minimal
  better-working design, introduce no slop). Tools that auto-load a global
  instructions file get the whole ruleset directly.
- **Project (`<repo>/AGENTS.md`) is an index** — a short preamble plus a linked
  table of contents pointing at focused modules under `.seh/`, loaded on demand:
  - `.seh/project.md` — mission, constraints, out-of-scope
  - `.seh/domain/*.md` — architecture, glossary
  - `.seh/stack/<tech>.md` — per-technology best practices

## Commands

### 1. Global setup (once per machine)

```bash
seh init --global            # interactive: choose which tools to symlink
seh init --global --tools claude --yes   # non-interactive
```

Creates:
- `~/.seh/AGENTS.md` — the unified global ruleset (Craftsmanship first, then
  security, quality gates, testing, commits, branching, dependencies, error
  handling, observability, data & privacy, documentation, refactoring, workflow,
  session startup, reporting, boundaries, code principles).
- `~/.seh/config.json` — which tools are symlinked.

Optionally wire tools to auto-load it (see `seh link`).

### 2. Project setup

```bash
cd your-project
seh init                     # detects technologies, interactive multi-select
seh init --tech typescript,python --yes   # non-interactive (≥1 required)
```

Creates:
- `AGENTS.md` — the project index (links to the modules below)
- `.seh/project.md`, `.seh/domain/architecture.md`, `.seh/domain/glossary.md`
- `.seh/stack/<tech>.md` for each selected technology
- `seh.lock` — records the selected technologies (commit it)

**Supported technologies:** `javascript`, `typescript`, `python`, `go`, `c`,
`rust`, `java`. No generic fallback — pick at least one.

Then fill in `.seh/project.md` and `.seh/domain/*` and re-sync.

### 3. Sync — regenerate from sources

```bash
seh sync
```

Rewrites the project `AGENTS.md` index and `.seh/stack/*` from `seh.lock`.
Idempotent (no change on re-run with unchanged sources).

### 4. Check — detect drift

```bash
seh check
```

Exit 0 if the generated files match the sources; exit 1 (with a message) if
`AGENTS.md` or a stack module is stale or missing. Suitable for pre-commit/CI.

### 5. Link — manage global tool symlinks

```bash
seh link --add claude        # symlink ~/.claude/CLAUDE.md -> ~/.seh/AGENTS.md
seh link --remove claude     # remove it
```

`AGENTS.md` stays the single source of truth; symlinks are pure pointers, so
there is no per-tool content to drift. Supported tools: `claude` (more to come).

## Installation

```bash
npm install -g se-harness
```

Or per project:

```bash
npm install --save-dev se-harness
npx seh init
```

## Try it (sandboxed demo)

Runs the whole flow against a throwaway `HOME` — your real `~/.seh` and
`~/.claude` are untouched:

```bash
npm run try
```

## Development

```bash
npm install
npm run build    # compile to dist/
npm test         # run the test suite
npm run dev      # run the CLI via tsx without building
```

## License

MIT
