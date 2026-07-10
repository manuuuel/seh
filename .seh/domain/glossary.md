# Glossary
<!-- Consult when you hit an unfamiliar domain term. -->

- **Harness** — the set of context files `seh` generates so AI agents load
  consistent guidance. Has two layers: global and project, optionally
  overridden by a harness package.
- **Layer** — `global` (host-wide, `~/.seh/`) or `project` (per-repo, `.seh/`).
  Most engine functions take a `layer` argument.
- **Canonical file** — the single real source of truth for a layer:
  `~/.seh/AGENTS.md` (global) and `<repo>/.seh/AGENTS.md` (project). Everything
  else pointing at it is a symlink.
- **Target** — the path a specific agent auto-loads (e.g. `~/.codex/AGENTS.md`,
  `<repo>/GEMINI.md`). Defined in `GLOBAL_TARGETS` / `PROJECT_TARGETS`.
- **Agent** — a supported AI coding agent: `claude`, `codex`, `pi`, `gemini`,
  `opencode`, `copilot`, `agents` (`SUPPORTED_AGENTS`). The `agents` target is
  the cross-agent interoperability path (`~/.agents/`, `.agents/`) used as an
  alias by Gemini CLI, Pi, Copilot, and others.
- **Global ruleset** — the fully-inlined `~/.seh/AGENTS.md`: every guardrail in
  one document (Craftsmanship first), built by `buildDocument`.
- **Project index** — the progressive-disclosure `<repo>/.seh/AGENTS.md`: a
  directive preamble + linked modules, built by `buildIndex`.
- **Module** — a focused project source file under `.seh/` (`project.md`,
  `domain/*.md`, `stack/<tech>.md`) linked from the project index.
- **When-to-read cue** — the short "read this when…" note appended after a
  module link, so agents load it only when relevant (`stackCue`/`moduleCue`).
- **Stack** — a supported technology with a bundled guideline module
  (`SUPPORTED_TECHS`, `assets/stacks/<tech>.md`).
- **Preamble** — the leading prose of a canonical file (`assets/core/*-preamble.md`).
- **Drift** — generated output no longer matches its sources, or a project
  symlink no longer resolves to the canonical file. `seh check` reports it.
- **`seh.lock`** — records the selected technologies for a repo; drives `sync`.
- **`config.json`** — `~/.seh/config.json`, the authoritative set of agents the
  user wires (`agents`) plus an optional active package path (`packagePath`).
- **Harness package** — a plain git directory (`harness.json`, `global/`,
  `templates/`, `projects/`, `skills/`) that overrides L0/L1 content when
  active. `seh` reads and scaffolds it; git is fully external.
- **Package resolution** — the precedence order for any file: package →
  `~/.seh/` → bundled core (L0). Handled by `PackageResolver`.
- **Skill** — a reusable `SKILL.md`-based capability package, vendored
  (committed to the package) or referenced (fetched at install time),
  distributed from the package to every agent's skill directory.
- **Skill routing** — a skill's `invoke` mode (`always`/`when`/`optional`),
  recorded in `harness.json` and rendered into `AGENTS.md`'s `## Skills`
  section by `seh sync`.
- **Memory** — `.seh/memory/<name>.md`, typed markdown files (`decision`/
  `constraint`/`learning`/`problem`) giving agents persistent project context
  across sessions. Rendered into `AGENTS.md`'s `## Memory` section by `seh sync`.
