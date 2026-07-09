# Harness Packages

**Date:** 2026-07-06  
**Status:** Draft

## Problem

The global harness (`~/.seh/`) is authored once per machine with no portability mechanism. Moving to a new host means re-authoring from scratch. Teams have no way to share a common harness baseline. There is no versioning or evolution history for harness decisions.

## Goal

Make the harness a first-class portable artifact: a plain directory the user versions with git, carries between machines, and shares with teammates. seh scaffolds and reads the package; git is fully external and never wrapped.

## Inspiration

Joel Niklaus, "Don't Train the Model, Evolve the Harness" (HuggingFace, 2026): an automated loop rewrites only the scaffold around a fixed model and lifts it 20 points on the Legal Agent Benchmark. Key finding relevant to seh: **structural harness patterns (file handling, context management, tool definitions) transfer across models; prompt playbooks do not.** This validates treating the harness as a versioned, shareable asset distinct from model weights.

## Concepts

### Harness package

A directory with a defined structure that holds global rules, reusable project templates, stack modules, and per-project overlays. The user runs `git init` on it and pushes to any remote. seh never calls git.

Stack modules (`templates/stack/`) are a subgroup of project templates — structural, code-level patterns that are the most portable part of the harness.

### Package resolution

When a package is configured, it takes precedence over seh's bundled defaults at every layer. If a file is absent from the package, seh falls back to its bundled core content.

## Package Structure

```
my-harness/
├── harness.json            — package metadata
├── CHANGELOG.md            — harness decisions and reasoning (human-authored)
├── global/
│   ├── AGENTS.md           — global ruleset (replaces ~/.seh/AGENTS.md)
│   └── config.json         — tool symlink config
├── templates/
│   ├── stack/              — per-technology structural patterns
│   │   ├── typescript.md
│   │   ├── python.md
│   │   └── ...
│   └── project/            — full project scaffolds (stack + domain combined)
│       ├── nextjs/
│       │   ├── project.md
│       │   └── stack/
│       └── fastapi/
└── projects/               — per-repo overlays matched by repo name
    ├── aigateway/
    └── nixos/
```

### `harness.json`

```json
{
  "name": "my-harness",
  "version": "1.0.0",
  "description": "Personal coding harness",
  "modelTag": "claude-sonnet-4-6"
}
```

`modelTag` is optional documentation — records which model the prompt content was tuned for. Has no runtime effect.

### `CHANGELOG.md`

Human-maintained log of harness decisions: what changed, why, and what effect it had. Inspired by the iteration log in the meta-harness paper. No enforced format — plain markdown.

## Layer Resolution (updated)

| Layer | Before packages | After packages |
|-------|----------------|----------------|
| L0 Core | bundled in CLI (always active) | bundled in CLI (fallback only) |
| L1 Global | `~/.seh/AGENTS.md` + `config.json` | package `global/` (wins over L0; falls back to `~/.seh/` if no package) |
| L2 Project | `.seh/` generated from L0 stack modules | generated from package `templates/` + `projects/<name>` overlay |

Resolution order for any file: **package → `~/.seh/` → seh bundled core**.

## New Commands

### `seh package init [path]`

Scaffolds a new harness package at `path` (default: `./my-harness`).

- Creates the full directory structure above
- Copies seh's bundled stack modules into `templates/stack/` as a starting point
- Writes a `harness.json` with name derived from the directory name
- Writes an empty `CHANGELOG.md`
- Prints a reminder: `cd <path> && git init && git add . && git commit -m "init harness"`

Does not call git.

### `seh package use <path>`

Points seh at an existing package. Writes `packagePath` into `~/.seh/config.json`.

```bash
# New machine workflow
git clone git@github.com:you/my-harness.git ~/my-harness
seh package use ~/my-harness
seh init --global   # re-links tool symlinks from package global/config.json
```

Validates that `path` exists and contains a `harness.json` before writing. Prints which package is now active.

### `seh package status`

Shows the currently active package path, its name/version from `harness.json`, and whether each expected directory exists.

## `seh init` integration

When a package is active, `seh init` offers project templates from `templates/project/` in addition to bare stack selection. If a project template is chosen, its `stack/` overrides take precedence over `templates/stack/`.

If the repo name matches an entry in `projects/`, that overlay is merged on top of the selected template during `seh sync`.

## Evolution

The harness evolves manually: the user edits package files, commits, and pushes. The CHANGELOG.md is the audit trail. There is no automated or AI-assisted proposal mechanism — the user owns the content entirely.

When seh ships updated bundled stack modules, users can review the diff against their own `templates/stack/` and selectively incorporate changes. There is no automated upgrade command; this is a deliberate choice to keep the user in control.

## Out of Scope

- `seh evolve` (AI-assisted harness proposals) — removed; adds LLM dependency without clear portability value
- Git wrappers (`seh push`, `seh pull`, `seh remote`) — git is fully external
- Conflict resolution — delegated entirely to git
- URL-based pull — out of scope for initial implementation

## Open Questions

- Should `projects/<name>` matching be exact (repo dirname) or configurable (alias in `harness.json`)?
- Should `seh package init` offer an `--from <existing-path>` flag to clone an existing package structure?
