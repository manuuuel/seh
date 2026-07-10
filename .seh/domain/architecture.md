# Architecture
<!-- Read before changing structure, modules, or data flow. -->

## Layers (the mental model)
- **L0 — Core:** authored source content bundled in the package under `assets/`
  (`assets/core/global/*` global sections, `assets/core/*-preamble.md`,
  `assets/stacks/<tech>.md`, `assets/project-template/`).
- **L1 — Global:** `~/.seh/AGENTS.md`, one fully-inlined ruleset + `config.json`
  (the user's agent set + optional `packagePath`). Authored once per machine;
  symlinked into agents.
- **L2 — Project:** `<repo>/.seh/AGENTS.md` (progressive index) + `.seh/` sources
  + `seh.lock`. Committed to the repo; symlinked into agents per-developer.
- **Package (optional):** a versioned git directory (`harness.json`, `global/`,
  `templates/`, `projects/`, `skills/`) that overrides L0/L1 content when active
  (see Package resolution below). Fully external to git — `seh` never wraps git.

Global rules apply everywhere; the project layer **extends, never contradicts** them.

## Module map (`src/`)
- `paths.ts` — pure path builders. The single source of truth for every file
  location: canonical sources (`globalIndexFile`, `projectCanonicalIndex`) and
  each agent's global/project target (`*GlobalFile`, `project*File`).
- `links.ts` — the **layer-aware symlink engine**. Two maps, `GLOBAL_TARGETS`
  and `PROJECT_TARGETS` (`agent -> path`), plus `linkAgent/unlinkAgent/isLinked
  (layer, agent, base)`, `SUPPORTED_AGENTS`, `readGlobalConfig`/
  `readConfiguredAgents(home)`. Also owns `SKILL_TARGETS` (`agent -> skills
  dir`) and `linkSkill(agent, skillName, home, sehSkillPath)` for the skills
  layer. Symlinks are **relative** (`path.relative` from the link dir to the
  canonical source) and replace any pre-existing file at the target.
- `catalog.ts` — reads L0 assets: `globalModules()`, `stackModule(tech)`,
  preambles, and the when-to-read cues (`stackCue`, `moduleCue`, `TECH_LABELS`).
- `package-resolver.ts` — `PackageResolver` class + `readResolver(home)`.
  Resolves global/stack/template/overlay content from an active package,
  falling back to `catalog.ts`'s L0 content when the package doesn't define a
  file (see Package resolution below).
- `index-emitter.ts` — pure formatting: `buildDocument` (inlined global),
  `buildIndex` (project index; renders `- [title](rel) — cue`), `titleOf`.
- `detect.ts` — `detectTechnologies(root)`: scans a repo for stack signals
  (e.g. `tsconfig.json`).
- `banner.ts` / `types.ts` — the generated-file banner and shared types
  (`LockFile`, `GlobalConfig`, `SkillInvoke`, `SkillEntry`, `HarnessPackage`,
  `MemoryType`, `MemoryEntry`).
- `commands/` — one file per verb: `initGlobal`, `initProject`, `sync`,
  `check`, `link`, `package` (`runPackageInit/Use/Status`), `install`
  (`runPackageInstall`), `skills` (`runSkillsAdd/Update/List`), `memory`
  (`runMemoryAdd/List/Remove`). These orchestrate the pure modules and do the
  filesystem writes.
- `cli.ts` — Commander wiring + interactive prompts; the only entrypoint.

## Data flow
- **`seh init --global`** → `initGlobal` writes `~/.seh/AGENTS.md` (via
  `buildDocument`, package-aware through `PackageResolver`) + `config.json`;
  `cli` calls `linkAgent('global', …)` per agent.
- **`seh init` / `seh sync`** → `sync` writes stack modules + canonical
  `.seh/AGENTS.md` (via `buildIndex` with cues) + `seh.lock`, then creates
  project symlinks for the agents in `config.json` and ensures the managed
  `.gitignore` block. `initProject` first lays down the `.seh/` template
  (package-aware: a package's `templates/project/` overrides the bundled
  template).
- **`seh check`** → recomputes expected content and compares; also verifies
  every existing project symlink resolves to `.seh/AGENTS.md`. Missing
  symlinks are OK (per-developer); wrong/stale ones are drift. Exit non-zero
  on drift/missing.
- **`seh link --add/--remove`** → maintains `config.json.agents` as the
  authoritative set and (un)links the global layer.
- **`seh package init/use/status`** → scaffolds a package directory, points
  `~/.seh/config.json.packagePath` at one, and reports its state.
  `seh package install --harness/--skills/--all` writes `~/.seh/AGENTS.md`
  from the package and symlinks referenced/vendored skills into
  `~/.seh/skills/<name>/` → each agent's skill directory (`SKILL_TARGETS`).
- **`seh skills add/update/list`** → vendors or references a skill into the
  active package's `skills/`, records routing (`invoke`) in `harness.json`,
  which `seh sync` renders into `AGENTS.md`'s `## Skills` section.
- **`seh memory add/list/remove`** → manages `.seh/memory/<name>.md` files
  (frontmatter `type`), which `seh sync` renders into `AGENTS.md`'s
  `## Memory` section.

## Package resolution
When a package is active (`~/.seh/config.json.packagePath` set),
`PackageResolver` takes precedence over `catalog.ts`'s bundled L0 content at
every layer; if a file is absent from the package, resolution falls back to
the bundled core. Resolution order for any file: **package → `~/.seh/` →
bundled core**.

## Key decisions
- **Symlinks, not copies** — one canonical file per layer, zero per-tool drift.
- **Progressive disclosure for the project layer** — small directive index with
  when-to-read cues; the global layer stays fully inlined (always-on guardrails).
- **`paths.ts` is authoritative** — never hardcode an agent path elsewhere; add
  it to `paths.ts` and reference it from `links.ts`/commands.
- **Purity boundary** — `paths`/`catalog`/`index-emitter`/`package-resolver` are
  side-effect-free and unit-tested in isolation; `commands/` own all filesystem
  effects.

See `.seh/memory/` for the reasoning behind specific past decisions
(symlinks-vs-copies, package resolution order, the `--tools`→`--agents`
rename, etc.) and open problems not yet resolved.
