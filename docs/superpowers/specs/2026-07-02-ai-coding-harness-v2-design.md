# SE-Harness v2 — Modular Index Harness (Design Spec)

**Date:** 2026-07-02
**Status:** Approved for planning
**Owner:** manuuuel
**Supersedes:** 2026-07-01-ai-coding-harness-design.md (single-file model)

A reusable, tool-agnostic framework for developing software with AI coding agents
(Claude Code, Codex, Copilot, Cursor, OpenCode, …), delivered as an installable
CLI (`seh`). v2 replaces the single concatenated `CLAUDE.md`/`AGENTS.md` with a
**modular set of single-topic files linked from a thin `AGENTS.md` index**, plus
**technology-aware generation** of per-stack guideline modules.

---

## 1. Why v2 (what changed and why)

v1 composed all layers (core + global + project) into one big `CLAUDE.md` and one
`AGENTS.md` per repo. Problems: the file grows unwieldy, mixes unrelated concerns,
duplicates global rules into every repo, and maintains two near-identical tool files.

v2 fixes this:
- **One canonical index file, `AGENTS.md`** (the cross-tool standard). No separate
  `CLAUDE.md` content — an optional symlink covers Claude Code.
- **Modular content**: `AGENTS.md` is a thin index (preamble + linked table of
  contents) pointing at focused single-topic module files, loaded on demand.
- **Global lives once on the host** (`~/.seh/`), not vendored into every repo.
- **Technology-aware generation**: the CLI detects candidate stacks, the user
  selects which apply, and it generates per-technology guideline modules.

---

## 2. Goals / Non-goals

**Goals**
- One source of truth; portable across tools; no vendor lock-in.
- Modular, focused files an agent can load selectively.
- Global rules authored once on the host; project layer carries only project-specific content.
- Technology-aware best-practice modules for the supported stacks.
- Solo-first, team-ready by design.

**Non-goals (v2)**
- Not a linter/CI platform. Not model/prompt tuning. Not a generic fallback stack
  (only the named technologies are supported; expand later).
- Not self-contained-per-repo by default (global is host-level; a vendor mode is a
  documented later opt-in for team/CI).

---

## 3. Architecture — layers & physical location

| Layer | Where | Content | Notes |
|-------|-------|---------|-------|
| **L0 Core** | inside CLI package (`assets/`) | cross-cutting global modules + per-technology guideline catalog | shareable source of truth |
| **L1 Global** | host, once: `~/.seh/` | `AGENTS.md` index + `global/*.md` modules | written by `seh init --global`; optional symlinks into tools' global paths; NOT vendored per repo |
| **L2 Project** | per repo | `AGENTS.md` index + `.seh/stack/<tech>.md` + `.seh/domain/*` + `.seh/project.md` | committed; references global by note, does not restate it |

**Precedence (conceptual): project > global > core.** In v2 the layers are not
concatenated; global is loaded by the tools at host level, project is loaded from
the repo. The project index notes that global rules apply and must not be contradicted.

### Naming (resolved)
- Host global folder: **`~/.seh/`**.
- Project folder: **`.seh/`**.
- npm package **`se-harness`**; binary **`seh`**.

---

## 4. The index & module model

The index model differs by layer:

**Host global `AGENTS.md` is a SINGLE self-contained file** (not an index): a
preamble + all cross-cutting sections inlined in one document, so the tools that
auto-load a global instructions file get the full ruleset directly. The
**Craftsmanship** section is forced first. Authored from modular source files
(kept modular for maintainability) but emitted as one file.

**Project `AGENTS.md` is an INDEX** (not a content dump):
- A short preamble (what this is, precedence, "extend not contradict").
- A linked table of contents: portable **relative Markdown links** to module files.
- Modules are loaded **on demand** by the agent (no tool-specific include syntax).

**Host global** (`~/.seh/`):
```
~/.seh/
  AGENTS.md                 # ONE unified file: preamble + all global sections inline
  config.json               # selected symlink targets, settings
```
Global source sections (emitted inline, Craftsmanship first): craftsmanship,
security, commits, quality-gates, code-principles, testing, error-handling,
dependencies, documentation, observability, data-privacy, refactoring, workflow,
branching, session-startup, reporting, boundaries.

**Project** (`<repo>/`):
```
<repo>/
  AGENTS.md                 # project index (links to .seh/ modules; notes global applies)
  CLAUDE.md                 # OPTIONAL symlink -> AGENTS.md (off by default)
  .seh/
    project.md              # mission, constraints, out-of-scope
    stack/                  # GENERATED per selected technology
      typescript.md  python.md  go.md  ...
    domain/
      glossary.md  architecture.md
  seh.lock                  # core version, selected techs, options (committed)
```

### Tool symlinks (host, user-selected)
`AGENTS.md` is canonical. The CLI offers to symlink it (or a per-tool filename)
into each tool's global instructions path so the harness auto-loads. The user
**chooses which tools**; default none. Examples (registry of "tool → global path"):
- Claude Code → `~/.claude/CLAUDE.md` → symlink to `~/.seh/AGENTS.md`
- Codex → its global `AGENTS.md` path
- (others added as the registry grows)

The symlink registry is pure path mapping — no per-tool content, no divergence.

---

## 5. Distribution & CLI

Installable Node + TypeScript CLI (`npx se-harness` / global `seh`). Core (L0)
ships inside the package. `sync`/`init` write `seh.lock` (core version + selected
technologies + options). Per-repo vendoring of global is a documented later opt-in.

### Commands

| Command | Scope | Behavior |
|---|---|---|
| `seh init --global` | host | Write `~/.seh/AGENTS.md` + `global/*` modules; prompt for which tools to symlink; write `config.json`. |
| `seh init` | repo | Detect candidate technologies; multi-select prompt (must pick ≥1); scaffold `.seh/` (project.md, domain/*, stack/<tech>.md per selection) + project `AGENTS.md` index; write `seh.lock`. |
| `seh sync` | repo | Regenerate project `AGENTS.md` index + stack modules from the catalog and selections in `seh.lock`. Idempotent. |
| `seh check` | repo | Drift detection: index vs modules vs catalog vs lock; non-zero exit on drift/missing. |
| `seh link` | host | Add/remove tool symlinks after the fact; reconcile with `config.json`. |
| `seh update` | host/repo | Pull newer core into global (and project) and re-sync. |

### Generator invariants
1. Idempotent & diff-friendly (no diff on re-run with unchanged inputs).
2. Do-not-edit banner on generated files (index + modules), pointing to sources.
3. Portable: index uses relative Markdown links only; no tool-specific include syntax.
4. Symlinks are pure pointers; no duplicated content.
5. Fail loud on drift (`check` non-zero) for pre-commit/CI.
6. No generic fallback: stack modules generated only for supported, selected techs.

---

## 6. Technology catalog (v2)

Supported technologies, each with an authored guideline/best-practices module in
the catalog (`assets/stacks/<tech>.md`), covering that stack's key practices
(idioms, testing, tooling, pitfalls, security):

- **JS/TS ecosystem** (`javascript`, `typescript`)
- **Python** (`python`)
- **Go** (`go`)
- **C** (`c`)
- **Rust** (`rust`)
- **Java** (`java`)

**Detection → selection:** `seh init` inspects the repo for markers
(`package.json`, `tsconfig.json`, `pyproject.toml`/`requirements.txt`, `go.mod`,
`Cargo.toml`, `pom.xml`/`build.gradle`, `*.c`/`Makefile`/`CMakeLists.txt`) to
pre-check likely technologies, then presents a multi-select. The user's final
selection (≥1) drives which stack modules are generated. Selections are recorded
in `seh.lock` so `sync` is reproducible. Catalog expands over time.

---

## 7. Workflows

### 7.1 New project
1. `seh init --global` (once per machine) → `~/.seh/` + choose tool symlinks.
2. In the repo: `seh init` → detect + multi-select technologies → scaffold `.seh/` + `AGENTS.md`.
3. Fill `.seh/project.md` and `.seh/domain/*`.
4. `seh sync`; commit `.seh/`, `AGENTS.md`, `seh.lock`.

### 7.2 Existing project
1. `seh init` (detection pre-fills), select technologies, fill domain/project gaps.
2. `seh sync`; optionally add `seh check` to CI/pre-commit. Commit.

### 7.3 Daily use
- Edit `.seh/` sources (never generated index/modules directly where marked generated).
- `seh sync` after changes; `seh check` guards drift.
- The agent reads `AGENTS.md` and follows links to the modules it needs.

### 7.4 Task workflows (referenced from global modules)
Feature / debugging / refactoring / testing / review each get a global module with
the same discipline as v1 (restate → locate → smallest change + tests → verify →
report), now as focused files instead of one blob.

---

## 8. Cross-cutting concerns (where they live)
Security, commits, quality-gates, testing, error-handling, dependencies,
documentation, observability, data-privacy, refactoring, workflow, branching,
session-startup, reporting, boundaries → **host global modules** (authored once).
Stack-specific practices → **per-technology modules**. Domain/architecture →
**project modules**.

---

## 9. Best practices (universal)
- One source of truth; `AGENTS.md` is an index, modules are focused.
- Global authored once on host; project carries only project-specific content.
- Smallest correct change; test behavioral change; keep build green.
- Extend, never contradict, higher layers.
- Commit project `.seh/` + index + `seh.lock` (self-describing project layer).

## 10. Anti-patterns
- Dumping everything into one giant instructions file.
- Per-tool content files that drift (tool-specificity = symlinks only).
- Vendoring global into every repo (duplication) unless explicitly chosen.
- Hand-editing generated files. Generic catch-all stack guidance.

## 11. Evaluation
- Drift rate (`check`), onboarding time, escalation quality, repeat-defect trend,
  adoption/friction. Qualitative first; metrics if a team adopts it.

## 12. Evolution
- Version core; `update` migrates global + projects. Grow the tech catalog and the
  symlink/tool registry on demand. Fold proven project lessons back into core.

---

## 13. Migration from v1
The v1 CLI exists (single-file compose, `~/.se-harness`, `.harness`, claude+agents
adapters). v2 reworks it:
- Rename host `~/.se-harness/`→`~/.seh/`; project `.harness/`→`.seh/`.
- Replace single-file `compose` output with **index + modules** emitter.
- Replace dual CLAUDE/AGENTS content with **one `AGENTS.md`** + optional symlink.
- Replace `adapters` (filename+wrapper) with a **symlink/tool-target registry**.
- Add **technology catalog** + detection + multi-select to `init`.
- Add **`link`** command; rename lockfile `harness.lock`→`seh.lock`.
- Reuse where possible: paths module, generator primitives (banner, provenance),
  drift-check approach, TDD structure.

---

## 14. Resolved Decisions
- Index model: portable relative Markdown links, on-demand loading.
- Single canonical `AGENTS.md`; optional `CLAUDE.md` symlink (default off).
- Global lives once on host `~/.seh/`; not vendored per repo (opt-in later).
- Tool symlinks user-selected; default none; stored in `~/.seh/config.json`.
- Host folder `~/.seh/`; project folder `.seh/`.
- Tech catalog v2: JS/TS, Python, Go, C, Rust, Java. User selects during `init`
  (≥1 required). No generic fallback.
- Commands: `init --global`, `init`, `sync`, `check`, `link`, `update`.

## 15. Open Items
- Exact global path each tool reads (Codex/Cursor/OpenCode) for the symlink registry —
  confirm per tool during implementation; ship Claude first, others as verified.
- Whether project `AGENTS.md` should also carry an optional `CLAUDE.md` symlink at
  repo level (consistent with host); default off.
