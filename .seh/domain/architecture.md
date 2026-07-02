# Architecture
<!-- Read before changing structure, modules, or data flow. -->

## Layers (the mental model)
- **L0 — Core:** authored source content bundled in the package under `assets/`
  (`assets/core/global/*` global sections, `assets/core/*-preamble.md`,
  `assets/stacks/<tech>.md`, `assets/project-template/`).
- **L1 — Global:** `~/.seh/AGENTS.md`, one fully-inlined ruleset + `config.json`
  (the user's tool set). Authored once per machine; symlinked into tools.
- **L2 — Project:** `<repo>/.seh/AGENTS.md` (progressive index) + `.seh/` sources
  + `seh.lock`. Committed to the repo; symlinked into tools per-developer.

Global rules apply everywhere; the project layer **extends, never contradicts** them.

## Module map (`src/`)
- `paths.ts` — pure path builders. The single source of truth for every file
  location: canonical sources (`globalIndexFile`, `projectCanonicalIndex`) and
  each tool's global/project target (`*GlobalFile`, `project*File`).
- `links.ts` — the **layer-aware symlink engine**. Two maps, `GLOBAL_TARGETS`
  and `PROJECT_TARGETS` (`tool -> path`), plus `linkTool/unlinkTool/isLinked
  (layer, tool, base)`, `SUPPORTED_TOOLS`, and `readConfiguredTools(home)`.
  Symlinks are **relative** (`path.relative` from the link dir to the canonical
  source) and replace any pre-existing file at the target. `copilot` is the only
  tool wired at both layers with distinct paths.
- `catalog.ts` — reads L0 assets: `globalModules()`, `stackModule(tech)`,
  preambles, and the when-to-read cues (`stackCue`, `moduleCue`, `TECH_LABELS`).
- `index-emitter.ts` — pure formatting: `buildDocument` (inlined global),
  `buildIndex` (project index; renders `- [title](rel) — cue`), `titleOf`.
- `detect.ts` — scans a repo for stack signals (e.g. `tsconfig.json`).
- `banner.ts` / `types.ts` — the generated-file banner and shared types.
- `commands/` — one file per verb: `initGlobal`, `initProject`, `sync`, `check`,
  `link`. These orchestrate the pure modules and do the filesystem writes.
- `cli.ts` — Commander wiring + interactive prompts; the only entrypoint.

## Data flow
- **`seh init --global`** → `initGlobal` writes `~/.seh/AGENTS.md` (via
  `buildDocument`) + `config.json`; `cli` calls `linkTool('global', …)` per tool.
- **`seh init` / `seh sync`** → `sync` writes stack modules + canonical
  `.seh/AGENTS.md` (via `buildIndex` with cues) + `seh.lock`, then creates
  project symlinks for the tools in `config.json` and ensures the managed
  `.gitignore` block. `initProject` first lays down the `.seh/` template.
- **`seh check`** → recomputes expected content and compares; also verifies every
  existing project symlink resolves to `.seh/AGENTS.md`. Missing symlinks are OK
  (per-developer); wrong/stale ones are drift. Exit non-zero on drift/missing.
- **`seh link --add/--remove`** → maintains `config.json.tools` as the
  authoritative set and (un)links the global layer.

## Key decisions
- **Symlinks, not copies** — one canonical file per layer, zero per-tool drift.
- **Progressive disclosure for the project layer** — small directive index with
  when-to-read cues; the global layer stays fully inlined (always-on guardrails).
- **`paths.ts` is authoritative** — never hardcode a tool path elsewhere; add it
  to `paths.ts` and reference it from `links.ts`/commands.
- **Purity boundary** — `paths`/`catalog`/`index-emitter` are side-effect-free
  and unit-tested in isolation; `commands/` own all filesystem effects.
