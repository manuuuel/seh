# Skills Distribution + `--agents` Rename

**Date:** 2026-07-06  
**Status:** Draft

## Problem

Skills authored for AI coding agents (Claude Code `~/.claude/skills/`, and future equivalents for other agents) have no distribution mechanism. They live on one machine and cannot be shared across hosts or with teammates. The `seh` harness package already solves this problem for instructions and stack guidelines — skills are the natural next layer.

Additionally, the existing `--tools` flag across the CLI is semantically misleading: the flag selects AI coding agents (Claude, Codex, Gemini, etc.), not generic tools.

## Goals

1. Add a `skills/` directory to the harness package structure
2. Allow skills to be vendored (committed) or referenced (fetched from external source, e.g. GitHub)
3. Distribute skills from the active package onto the host machine via a new `seh package install` command
4. Rename `--tools` → `--agents` (and related internals) across the entire CLI

## Non-Goals

- Memory distribution (separate future spec)
- Model-specific harness configuration
- A centralised skill registry
- Automated skill updates (user runs `seh skills update` explicitly)

---

## Package Structure

`skills/` added alongside existing directories:

```
my-harness/
├── harness.json
├── CHANGELOG.md
├── global/
├── templates/
├── projects/
└── skills/
    ├── brainstorming/        ← vendored (committed to package repo)
    │   └── brainstorming.md
    └── caveman/              ← referenced (gitignored, fetched on install)
        └── caveman.md
```

Each subdirectory of `skills/` is one skill. The directory name is the skill name. Structure inside matches what each agent expects (for Claude Code: a directory containing at least one `.md` file named after the skill).

Referenced skills are listed in `.gitignore` within the package. Vendored skills are committed normally.

---

## `harness.json` Skills Metadata

```json
{
  "name": "my-harness",
  "version": "1.0.0",
  "description": "Personal coding harness",
  "skills": {
    "caveman": {
      "source": "https://github.com/JuliusBrussee/caveman",
      "type": "reference",
      "ref": "main"
    },
    "brainstorming": {
      "type": "vendor"
    }
  }
}
```

`type: "reference"` — skill is fetched from `source` at install time; not committed to the package repo.  
`type: "vendor"` — skill files live in the package repo; `source` omitted.  
`ref` — branch, tag, or commit SHA for referenced skills (defaults to `"main"`).

---

## Layer Model

```
<package>/skills/<name>/   ←  source (vendored in repo, or fetched reference)
         ↓ symlink
~/.seh/skills/<name>/      ←  L1 stable intermediate (always present after install)
         ↓ symlink
~/.claude/skills/<name>/   ←  agent target (Claude Code)
~/.codex/skills/<name>/    ←  agent target (future)
```

`~/.seh/skills/` is the stable intermediate: if the package moves or is replaced, tool symlinks remain intact until re-pointed.

If an agent does not have a skill directory concept, seh skips it silently with a note.

---

## Agent Skill Targets

All supported agents have confirmed user-level skill directories (verified against official docs and source repos, 2026-07):

| Agent | Skills directory | Source verified |
|-------|-----------------|-----------------|
| `claude` | `~/.claude/skills/<name>/` | Claude Code source |
| `codex` | `~/.codex/skills/<name>/` | openai/codex source (`CODEX_HOME/skills/`) |
| `gemini` | `~/.gemini/skills/<name>/` | google-gemini/gemini-cli docs |
| `opencode` | `~/.config/opencode/skills/<name>/` | sst/opencode source (XDG config dir + `skills/`) |
| `pi` | `~/.pi/agent/skills/<name>/` | earendil-works/pi docs |
| `copilot` | `~/.copilot/skills/<name>/` | GitHub Copilot docs |
| `agents` | `~/.agents/skills/<name>/` | cross-agent interoperability alias (Gemini CLI, Pi) |

`SKILL_TARGETS` in `src/links.ts` maps all seven agent keys to their respective path functions.

---

## New Commands

### `seh skills add <url> [--vendor | --reference] [--ref <branch-or-tag>]`

Adds an external skill to the active package.

- Requires an active package (`seh package use` must have been run)
- Infers skill name from the URL's repository name (e.g. `JuliusBrussee/caveman` → `caveman`)
- Prompts for vendor vs reference if flag omitted
- If `--vendor`: clones/downloads skill files into `<package>/skills/<name>/`
- If `--reference`: adds entry to `harness.json`; appends `skills/<name>/` to package `.gitignore`; does not fetch yet
- `--ref` sets the branch/tag (default: `main`)
- Supported URL formats: `https://github.com/<owner>/<repo>`, `github:<owner>/<repo>` shorthand

### `seh skills update [<name>]`

Re-fetches referenced skills from their source.

- No arguments: updates all referenced skills in the active package
- With name: updates only the named skill
- Errors if the skill is vendored (no source to fetch from)
- Does not affect `~/.seh/skills/` symlinks (run `seh package install --skills` to re-sync after update)

### `seh skills list`

Shows skills in the active package.

```
skill          type        source
brainstorming  vendor      —
caveman        reference   https://github.com/JuliusBrussee/caveman (ref: main)
```

### `seh package install [--skills] [--harness] [--all] [--agents <list>]`

Installs artifacts from the active package onto the host machine.

| Flag | Action |
|------|--------|
| `--harness` | Writes `~/.seh/AGENTS.md` from `package/global/AGENTS.md`; updates agent symlinks |
| `--skills` | Fetches referenced skills, symlinks into `~/.seh/skills/`, then into selected agent dirs |
| `--all` | Both of the above |
| (no flag) | Interactive prompt to select what to install |

`--agents <list>` scopes which agents receive skill symlinks. Prompts interactively (multiselect) if omitted. Only agents configured in `global/config.json` are shown.

**`--skills` flow:**
1. For each skill in `harness.json` with `type: "reference"`: fetch if not present locally
2. Symlink `<package>/skills/<name>/` → `~/.seh/skills/<name>/`
3. Prompt: "Install skills into which agents?" (or use `--agents` flag)
4. For each selected agent that supports skills: symlink `~/.seh/skills/<name>/` → `<agent-skills-dir>/<name>/`

**Conflict handling:** if skill already exists at destination, skip and report. `--force` overwrites.

**New machine workflow:**
```bash
git clone git@github.com:you/my-harness.git ~/my-harness
seh package use ~/my-harness
seh package install --all --agents claude
```

---

## `--tools` → `--agents` Rename

### CLI flags

| Before | After |
|--------|-------|
| `seh init --global --tools <list>` | `seh init --global --agents <list>` |
| `seh link --add <tool>` | `seh link --add <agent>` (flag name unchanged, description updated) |
| `seh package install --tools <list>` (new) | `seh package install --agents <list>` |

### Internals

| Before | After |
|--------|-------|
| `SUPPORTED_TOOLS` | `SUPPORTED_AGENTS` |
| `readConfiguredTools()` | `readConfiguredAgents()` |
| `config.json: { tools: [] }` | `config.json: { agents: [] }` |
| `linkTool()` | `linkAgent()` |
| `unlinkTool()` | `unlinkAgent()` |
| `isLinked('global', tool, base)` | `isLinked('global', agent, base)` |

`config.json` migration: on first read, if `tools` key exists and `agents` does not, copy value from `tools` to `agents` and rewrite the file. This ensures existing configs are upgraded transparently.

---

## Open Questions

- Should `seh skills add` support non-GitHub sources (plain HTTPS tarball, local path)?
- Should referenced skill `ref` support pinning to a specific commit SHA for reproducibility?
