# History Rewrite & Memory Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distill `docs/superpowers/{plans,specs}/` into 11 curated
`.seh/memory/*.md` entries, refresh this repo's stale
`.seh/domain/{architecture,glossary}.md`, remove the superseded planning
directory, then rewrite git history to strip it (and two incident files)
from every commit, per
`docs/superpowers/specs/2026-07-10-history-rewrite-memory-migration-design.md`.

**Architecture:** Tasks 1-3 are normal file changes that go through the
regular PR flow (subagent-driven, reviewed, merged). Task 4 (the history
rewrite) is executed directly by the session controller after Tasks 1-3
are merged, because it requires a force-push that cannot go through a pull
request.

**Tech Stack:** Markdown (Tasks 1-3), `git filter-repo` + `gh api` (Task 4).

## Global Constraints

- Exactly 11 memory files, with the exact content specified in Task 1 —
  no more, no less.
- `.seh/domain/architecture.md` and `glossary.md` must match current
  `src/` exactly (verified against source in this plan; do not re-derive at
  implementation time).
- Task 4 runs only after Tasks 1-3 are merged to `main`, and only after
  re-confirming no forks/other clones exist.
- The branch-protection ruleset (`main-protection`) must end Task 4 in the
  exact same configuration it had before Task 4 started.

---

### Task 1: Create 11 memory entries

**Files:**
- Create: `.seh/memory/symlinks-not-copies.md`
- Create: `.seh/memory/progressive-disclosure-project-layer.md`
- Create: `.seh/memory/package-resolution-order.md`
- Create: `.seh/memory/memory-is-just-files.md`
- Create: `.seh/memory/skill-routing-modes.md`
- Create: `.seh/memory/tools-renamed-to-agents.md`
- Create: `.seh/memory/contributing-points-to-agentsmd.md`
- Create: `.seh/memory/github-enforce-admins-bypasses-everything.md`
- Create: `.seh/memory/gh-api-nested-bool-params-need-dash-F.md`
- Create: `.seh/memory/package-projects-matching-strategy.md`
- Create: `.seh/memory/skills-non-github-sources.md`

- [ ] **Step 1: Create each file with this exact content**

`.seh/memory/symlinks-not-copies.md`:
```markdown
---
type: decision
---

# Symlinks, not copies

Canonical files (`~/.seh/AGENTS.md` globally, `<repo>/.seh/AGENTS.md` per
project) are symlinked into every tool's real config path — never copied.
This guarantees zero per-tool drift: there is exactly one real file per
layer, and every tool-specific path (`CLAUDE.md`, `GEMINI.md`, etc.) is a
pointer to it. On symlink failure, `seh` fails loudly with an actionable
message rather than falling back to a copy.
```

`.seh/memory/progressive-disclosure-project-layer.md`:
```markdown
---
type: decision
---

# Progressive disclosure for the project layer

The project layer (`<repo>/.seh/AGENTS.md`) is a short directive index with
when-to-read cues pointing at focused modules under `.seh/` — loaded on
demand, not all at once. The global layer (`~/.seh/AGENTS.md`) is the
opposite: one fully-inlined document, since global guardrails should
always be loaded, not conditionally read.
```

`.seh/memory/package-resolution-order.md`:
```markdown
---
type: decision
---

# Package resolution order

Resolution order for any file is: harness package → `~/.seh/` → seh's
bundled core (L0). When a harness package is configured, it takes
precedence over seh's bundled defaults at every layer; if a file is absent
from the package, seh falls back to its bundled core content. This lets a
team's shared package override individual defaults without seh needing to
know about git at all — git is fully external to seh.
```

`.seh/memory/memory-is-just-files.md`:
```markdown
---
type: decision
---

# Memory is just files

`.seh/memory/<name>.md`, committed to the repo — no generation, no hooks,
no external dependencies. `seh sync` surfaces them in `AGENTS.md`'s
`## Memory` section; agents are instructed by the harness protocol to write
memory at session end. Humans or agents update them directly when things
change. This keeps the system inspectable and diffable in plain git, with
no moving parts beyond markdown files.
```

`.seh/memory/skill-routing-modes.md`:
```markdown
---
type: decision
---

# Skill routing has three mutually exclusive modes

A skill's `invoke` field in `harness.json` is exactly one of `always`
(every response), `when` (a described condition), or `optional` (agent
decides). This is rendered into a `## Skills` section in `AGENTS.md` by
`seh sync`, grouped by mode, so agents always know which skills to invoke
and when — without needing to infer intent from prose.
```

`.seh/memory/tools-renamed-to-agents.md`:
```markdown
---
type: decision
---

# `--tools` renamed to `--agents`

CLI flags and internals were renamed from `--tools`/`linkTool`/
`SUPPORTED_TOOLS` to `--agents`/`linkAgent`/`SUPPORTED_AGENTS`. "Agent" is
the more accurate term for what seh targets (Claude Code, Codex, Gemini
CLI, etc. are AI coding agents, not generic developer tools). If you find
old issues, PRs, or forks referencing `--tools`, this is why — and it's why
`scripts/try.sh` broke once before being fixed: any code or docs still
using the old names are stale.
```

`.seh/memory/contributing-points-to-agentsmd.md`:
```markdown
---
type: decision
---

# CONTRIBUTING.md delegates to AGENTS.md

`CONTRIBUTING.md` does not describe any specific internal authoring
pipeline (brainstorming/spec/plan or otherwise) — it points contributors at
`AGENTS.md` as the single binding contract for workflow, commit
conventions, branching, and quality gates. Internal authoring workflows are
tooling choices, not repo-level contribution rules, and can change without
`CONTRIBUTING.md` going stale.
```

`.seh/memory/github-enforce-admins-bypasses-everything.md`:
```markdown
---
type: learning
---

# Classic branch protection's enforce_admins is all-or-nothing

Setting `enforce_admins: false` on GitHub's classic branch protection
lets admins bypass *every* rule in that protection — including "changes
must be made through a pull request" and the force-push/deletion blocks —
not just the required-approving-review-count, which was the only rule this
project intended admins to bypass. This was discovered by testing with a
real direct push to `main`, which unexpectedly succeeded
("Bypassed rule violations").

Fix: use a repository ruleset instead of classic branch protection, with
`bypass_actors: [{ actor_type: "RepositoryRole", actor_id: 5, bypass_mode:
"pull_request" }]`. `bypass_mode: "pull_request"` scopes the bypass to
PR-merge time only — a direct push is still rejected
(`GH013: Repository rule violations`), while merging your own PR without a
second reviewer still works. Verified both directions with real pushes
before trusting the config.
```

`.seh/memory/gh-api-nested-bool-params-need-dash-F.md`:
```markdown
---
type: learning
---

# gh api nested bracket params: use -F for booleans/integers, not -f

`gh api`'s `-f key=value` always sends `value` as a JSON string. For
nested bracket parameters like `required_status_checks[strict]=false` or
`required_pull_request_reviews[required_approving_review_count]=1`, a
string `"false"`/`"1"` fails GitHub's schema validation ("is not a
boolean" / "is not an integer") even though the top-level flag structure
looks identical to a string field. Use `-F` (typed: recognizes `true`/
`false`/numbers/`null`/`@file`) for any nested boolean or integer field.
```

`.seh/memory/package-projects-matching-strategy.md`:
```markdown
---
type: problem
---

# Should package project overlays match by exact dirname or alias?

Harness packages support per-repo overlays under `projects/<name>/`. It's
unresolved whether `<name>` matching against a repo should require an
exact match to the repo's directory name, or support a configurable alias
in `harness.json` (so a package author can map multiple clone locations,
or a renamed local directory, to the same overlay). No decision made yet;
revisit when a real multi-repo package in the wild needs it.
```

`.seh/memory/skills-non-github-sources.md`:
```markdown
---
type: problem
---

# Should seh skills add support non-GitHub sources and SHA pinning?

`seh skills add <url>` currently expects a GitHub URL. Two open questions:
whether to support non-GitHub sources (a plain HTTPS tarball, or a local
filesystem path, for private/internal skills that don't live on GitHub),
and whether a referenced skill's `ref` should support pinning to a specific
commit SHA (not just a branch/tag) for reproducibility. No decision made
yet; revisit when a real use case needs either.
```

- [ ] **Step 2: Verify all 11 files exist with correct frontmatter**

Run: `for f in .seh/memory/*.md; do echo "=== $f ==="; head -3 "$f"; done`
Expected: 11 files, each starting with `---`, a `type:` line
(`decision`/`learning`/`problem` matching the assignments above), and `---`.

- [ ] **Step 3: Commit**

```bash
git add .seh/memory/
git commit -m "docs(memory): distill planning history into 11 memory entries"
```

---

### Task 2: Refresh `.seh/domain/architecture.md` and `glossary.md`

**Files:**
- Modify: `.seh/domain/architecture.md` (full file rewrite)
- Modify: `.seh/domain/glossary.md` (full file rewrite)

- [ ] **Step 1: Replace `.seh/domain/architecture.md` with this exact content**

```markdown
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
```

- [ ] **Step 2: Replace `.seh/domain/glossary.md` with this exact content**

```markdown
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
```

- [ ] **Step 3: Verify**

Run: `grep -c "SUPPORTED_TOOLS\|linkTool\|unlinkTool" .seh/domain/architecture.md .seh/domain/glossary.md`
Expected: `.seh/domain/architecture.md:0` and `.seh/domain/glossary.md:0`
(confirms no stale pre-rename names remain).

- [ ] **Step 4: Commit**

```bash
git add .seh/domain/architecture.md .seh/domain/glossary.md
git commit -m "docs(seh): refresh architecture and glossary for current src/"
```

---

### Task 3: Remove `docs/superpowers/{plans,specs}/` from the current tree

**Files:**
- Delete: `docs/superpowers/plans/*.md` (11 files)
- Delete: `docs/superpowers/specs/*.md` (11 files)

- [ ] **Step 1: Delete both directories**

```bash
git rm -r docs/superpowers/plans docs/superpowers/specs
```

- [ ] **Step 2: Verify**

Run: `ls docs/superpowers 2>&1; find docs -type f`
Expected: `docs/superpowers` no longer exists (or is empty); `find docs`
returns nothing, since these were the only files under `docs/`.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove docs/superpowers (migrated to .seh/memory)"
```

---

### Task 4: Rewrite git history (controller-executed, not a PR)

**Files:** None in this repo's working tree beyond what Tasks 1-3 already
changed — this task operates on git history itself, on a separate fresh
clone.

This task is executed directly by the session controller after Tasks 1-3
are merged to `main`, since it requires a force-push that cannot go through
a pull request, and must not be attempted on the working directory used for
the rest of this session (a mistake mid-rewrite must not corrupt the
checkout we still need).

- [ ] **Step 1: Re-confirm no forks/other clones exist**

Run: `gh api repos/manuuuel/seh --jq '.forks_count'`
Expected: `0`. If nonzero, STOP and escalate to the human — a history
rewrite will break any existing fork/clone.

- [ ] **Step 2: Install `git filter-repo` if not present**

Run: `command -v git-filter-repo || brew install git-filter-repo`

- [ ] **Step 3: Disable the branch-protection ruleset**

Run: `gh api repos/manuuuel/seh/rulesets --jq '.[] | select(.name=="main-protection") | .id'`
to get the ruleset id, then:

```bash
gh api repos/manuuuel/seh/rulesets/<id> --method PUT -f enforcement=disabled
```

Verify: `gh api repos/manuuuel/seh/rulesets/<id> --jq '.enforcement'` prints
`disabled`.

- [ ] **Step 4: Rewrite history on a fresh clone**

```bash
cd /tmp
git clone https://github.com/manuuuel/seh.git seh-rewrite
cd seh-rewrite
git filter-repo \
  --path docs/superpowers --invert-paths \
  --path protection-test.md --invert-paths \
  --path verify-pr-bypass.md --invert-paths
```

- [ ] **Step 5: Verify the rewritten history**

Run: `git log --all --oneline -- docs/superpowers protection-test.md verify-pr-bypass.md`
Expected: no output (no commit anywhere in history touches these paths).

Run: `git log --oneline | wc -l` and compare to the pre-rewrite count
(`git -C /Users/manuel.di.pietro/Desktop/Projects/Personal/workspace/pocs/seh log --oneline | wc -l`
run beforehand) — expect the same or fewer commits (filter-repo prunes
commits that become empty), never more.

Run: `npm install && npm run build && npm test` inside `seh-rewrite`.
Expected: build succeeds, all tests pass.

- [ ] **Step 6: Force-push the rewritten history**

```bash
git push origin main --force
```

- [ ] **Step 7: Re-create the branch-protection ruleset**

```bash
cat > /tmp/ruleset.json << 'EOF'
{
  "name": "main-protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "required_status_checks": [
          { "context": "test (18)" },
          { "context": "test (20)" },
          { "context": "test (22)" }
        ],
        "strict_required_status_checks_policy": false
      }
    },
    { "type": "deletion" },
    { "type": "non_fast_forward" }
  ],
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "pull_request" }
  ]
}
EOF
```

If the old ruleset (disabled in Step 3) still exists, delete it first:
`gh api repos/manuuuel/seh/rulesets/<id> --method DELETE`. Then:

```bash
gh api repos/manuuuel/seh/rulesets --method POST --input /tmp/ruleset.json
```

- [ ] **Step 8: Verify protection is active**

Run: `gh api repos/manuuuel/seh/rulesets --jq '.[] | {name, enforcement}'`
Expected: `{"name": "main-protection", "enforcement": "active"}`.

- [ ] **Step 9: No commit in the original working directory**

Return to the original checkout
(`/Users/manuel.di.pietro/Desktop/Projects/Personal/workspace/pocs/seh`) and
run `git fetch origin && git reset --hard origin/main` to sync it to the
rewritten history. This is a local-only reset (matching the new remote
history), not a new commit.
