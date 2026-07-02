# SE-Harness — Multi-Tool Symlink Targets & Progressive Project Index (Design Spec)

**Date:** 2026-07-02
**Status:** Approved for planning
**Owner:** Manuel Di Pietro
**Extends:** 2026-07-02-ai-coding-harness-v2-design.md

Make the harness files that `seh` generates actually load in every supported
agent — pi, Codex, Gemini CLI, GitHub Copilot, OpenCode, and Claude Code — by
targeting each tool's real context-file path via symlinks, and by making the
project index a progressive-disclosure directive that agents can follow.

---

## 1. Problem

`seh` produced two files but neither reliably reached most tools:

1. **Wrong file / wrong location per tool.** The premise "`AGENTS.md` is the
   universal entrypoint" holds only for Codex and pi. Each tool auto-loads a
   *different* filename in a *different* directory, and two don't use the name
   `AGENTS.md` at all. `links.ts` only wired the Claude **global** file
   (`~/.claude/CLAUDE.md`); every other tool and the entire project layer were
   unwired. A single `~/AGENTS.md` is read by **no** tool.

2. **The project `AGENTS.md` was a dead link list.** Tools load the *raw text*
   of a context file; none follow `[title](path)` markdown links. So the linked
   `.seh/*` module bodies never entered any model's context — only a table of
   contents did.

**Verified tool conventions (Context7, 2026-07-02):**
- **Gemini CLI** default context file is `GEMINI.md`; does not read `AGENTS.md`
  unless `context.fileName` is configured in `settings.json`.
- **GitHub Copilot** uses `.github/copilot-instructions.md` at repo root; there
  is **no** user-global instruction file.

---

## 2. Goals / Non-goals

**Goals**
- Zero-config auto-load in pi, Codex, Gemini CLI, Copilot, OpenCode, Claude Code.
- One source of truth per layer; symlinks are pure pointers (no content drift).
- Project index uses **progressive disclosure**: small always-on core, with
  reference modules loaded on demand.

**Non-goals**
- No copy-based fallback (copies reintroduce drift). Symlink-only.
- No Windows symlink workaround beyond a clear, actionable error.
- No change to global `AGENTS.md` *content* (it stays fully inlined).

---

## 3. Design

### 3.1 Global layer (content unchanged)

`~/.seh/AGENTS.md` stays the fully-inlined ruleset (`buildDocument`). `seh link`
creates one symlink per configured tool, each pointing at `~/.seh/AGENTS.md`:

| Tool | Global symlink target |
|------|----------------------|
| claude | `~/.claude/CLAUDE.md` |
| codex | `~/.codex/AGENTS.md` |
| pi | `~/.pi/agent/AGENTS.md` |
| gemini | `~/.gemini/GEMINI.md` |
| opencode | `~/.config/opencode/AGENTS.md` |
| copilot | — (no user-global file; repo-only) |

### 3.2 Project layer (progressive-disclosure index)

Canonical project file moves to **`.seh/AGENTS.md`** (committed). It is a
*directive* index, not a bare link list:

- **Always-on block, inlined:** the project preamble plus any *project-specific*
  hard constraints that must never be skipped (mission, out-of-scope, local
  escalation rules). It does **not** restate the global guardrails — those are
  already always-on via the global file; the project layer only extends them.
- **On-demand entries:** each linked module carries a **when-to-read cue**,
  mirroring how skills advertise themselves. Example:

  ```
  - [TypeScript Guidelines](.seh/stack/typescript.md) — read before writing or
    reviewing any .ts/.tsx code.
  ```

- **Link base = repo root.** Because tools load the file via a root symlink,
  links are written relative to the repo root (`.seh/stack/…`), not to `.seh/`.

Per-tool project symlinks point at `.seh/AGENTS.md`:

| Tool | Project symlink target |
|------|------------------------|
| codex / pi / opencode | `<root>/AGENTS.md` |
| claude | `<root>/CLAUDE.md` |
| gemini | `<root>/GEMINI.md` |
| copilot | `<root>/.github/copilot-instructions.md` |

**Project symlinks are NOT committed.** Only `.seh/` sources are committed.
`seh init`/`sync` regenerate the symlinks locally per developer; they are added
to the repo `.gitignore`. This avoids Windows checkout breakage and lets each
developer wire only the tools they use.

### 3.3 Code shape

- **`links.ts`** — replace the single `TOOL_TARGETS` with two maps:
  `GLOBAL_TARGETS` and `PROJECT_TARGETS` (`tool -> (base) => absolutePath`).
  `linkTool`/`unlinkTool`/`isLinked` take a layer argument and resolve the
  correct source (global `~/.seh/AGENTS.md` vs project `.seh/AGENTS.md`).
- **`paths.ts`** — add `projectCanonicalIndex = <root>/.seh/AGENTS.md` and
  per-tool global/project path helpers (codex, pi, gemini, opencode, copilot).
- **`index-emitter.ts`** — project builder emits the always-on block + entries
  with when-to-read cues; keeps `.seh/*` module bodies as separate files.
- **`initProject` / `sync`** — write canonical `.seh/AGENTS.md`, create the
  configured project symlinks, ensure `.gitignore` covers them.
- **`link`** — manage both layers for the configured tools.
- **`check`** — pass only when generated content matches sources AND every
  configured symlink resolves (`realpath`) to the correct canonical file;
  report missing/stale/misdirected links.

### 3.4 Symlink policy

- Symlink-only. On failure (notably Windows without Developer Mode/admin),
  abort with a clear message naming the target path and remediation; do not
  silently fall back to copying.

---

## 4. Error handling

- Unknown tool name → explicit error listing supported tools per layer.
- Symlink creation failure → actionable error (path + cause + Windows hint).
- Malformed `config.json` → surfaced, not swallowed.
- `check` → non-zero exit with a per-file/per-link diagnosis.

---

## 5. Testing

- **paths**: each per-tool global/project target resolves to the expected path.
- **links**: link/unlink/isLinked for every tool, both layers, against a
  sandbox `HOME` and sandbox repo; symlinks resolve to canonical sources.
- **emitter**: project index contains the always-on block and when-to-read
  cues; links are repo-root-relative.
- **initProject/sync**: creates `.seh/AGENTS.md` + configured symlinks; adds
  gitignore entries; idempotent re-run.
- **check**: detects a deleted symlink, a symlink pointing elsewhere, and stale
  generated content.
- **e2e**: sandboxed full flow (global + project) for a multi-tool selection.

---

## 6. Migration

- Repos generated by the old model have a real `AGENTS.md` file at root. `seh
  sync` replaces it with the canonical `.seh/AGENTS.md` + symlinks and updates
  `.gitignore`. A one-line note in `seh sync` output explains the change.
