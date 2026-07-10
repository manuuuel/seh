# History rewrite & memory migration — design

## Context

Sub-project 4 of a 4-part public-readiness effort (README polish → GitHub
hardening → stack enrichment → **history rewrite/memory migration**),
deliberately last because it is the only irreversible step (a force-push
rewriting public history). An audit during brainstorming additionally found
this repo's own dogfooded `.seh/domain/architecture.md` and `glossary.md`
are stale (pre-date the packages/skills/memory/agents-rename features),
which is folded into this sub-project since it's the same theme: this
repo's own accurate self-knowledge.

## Goals

- Distill the 22 files under `docs/superpowers/{plans,specs}/` — 11 spec
  docs + 11 plan docs from this project's development history — into 11
  curated `.seh/memory/*.md` entries (listed below), capturing genuine
  lasting decisions/learnings/open-problems, not a transcription of the
  planning bloat.
- Refresh `.seh/domain/architecture.md` and `.seh/domain/glossary.md` to
  accurately reflect current `src/` (packages, skills, memory, the
  `--agents` rename, all 7 supported agents).
- Remove `docs/superpowers/{plans,specs}/` from the current tree (superseded
  by the memory entries above).
- Rewrite git history with `git filter-repo` to remove
  `docs/superpowers/{plans,specs}/` from every commit that ever touched it,
  and to remove the two files from the branch-protection-testing incident
  (`protection-test.md`, `verify-pr-bypass.md`) from every commit — per the
  user's explicit choice of selective rewrite (option B) over a full squash.
- Force-push the rewritten history to `origin/main`, after temporarily
  disabling the branch-protection ruleset (which blocks force-push) and
  recreating it identically afterward.

## Non-goals

- No full history squash (user explicitly chose selective `filter-repo`
  rewrite over a single-commit history).
- No changes to any other historical content — commit authorship, messages,
  and all other files' history are preserved exactly as they are.
- Not attempting to purge every one of the 22 planning files' individual
  ideas into memory — only the 11 curated entries below. The full planning
  detail is intentionally not preserved anywhere after this sub-project;
  it was working material for building the CLI, not documentation the
  project needs going forward.
- No changes to `assets/*` content (covered by sub-project 3).

## Part 1 — Memory entries

Create `.seh/memory/<name>.md` for each of the following, using the format
from `.seh/memory/` (frontmatter `type: decision|learning|problem`, H1
title, body prose — matching the format documented in this project's own
README `## Memory` section).

### Decisions

**`symlinks-not-copies.md`**
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

**`progressive-disclosure-project-layer.md`**
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

**`package-resolution-order.md`**
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

**`memory-is-just-files.md`**
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

**`skill-routing-modes.md`**
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

**`tools-renamed-to-agents.md`**
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
`scripts/try.sh` broke once before being fixed (see the `github-hardening`
and bugfix history): any code or docs still using the old names are stale.
```

**`contributing-points-to-agentsmd.md`**
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

### Learnings

**`github-enforce-admins-bypasses-everything.md`**
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

**`gh-api-nested-bool-params-need-dash-F.md`**
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

### Open problems

**`package-projects-matching-strategy.md`**
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

**`skills-non-github-sources.md`**
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

## Part 2 — Refresh `.seh/domain/architecture.md` and `glossary.md`

Both files currently describe pre-`--agents`-rename internals
(`SUPPORTED_TOOLS`, `linkTool`/`unlinkTool`) and omit three shipped
features entirely: Harness Packages, Skills (with routing), and Memory.
Rewrite both to match current `src/` exactly:

- `architecture.md`: update the module map to current file/export names
  (`SUPPORTED_AGENTS`, `linkAgent`/`unlinkAgent`, `GLOBAL_TARGETS`/
  `PROJECT_TARGETS` — these names are already current, verify against
  `src/links.ts` at implementation time) and add the package resolver
  (`package-resolver.ts`), skills commands (`commands/skills.ts`,
  `commands/package.ts`), and memory command (`commands/memory.ts`) to the
  module map and data-flow sections.
- `glossary.md`: add terms for `Harness package`, `Skill`, `Skill routing`,
  `Memory`, `Memory type`; update `Tool` → `Agent` (`SUPPORTED_AGENTS`) and
  the agent list to all 7 (`claude`, `codex`, `pi`, `gemini`, `opencode`,
  `copilot`, `agents`).

Exact replacement content is written at implementation time by reading the
current `src/` modules directly (this design doc specifies *what* must be
covered, not the literal final prose, since it must match code that could
still change before the plan executes).

## Part 3 — Remove `docs/superpowers/{plans,specs}/` from the current tree

Delete both directories (22 files) in a normal commit, as part of the
regular PR flow (this part goes through subagent-driven review like every
other sub-project so far).

## Part 4 — Rewrite git history (controller-executed, not a PR)

This part is executed directly by the session controller after Parts 1-3
are merged to `main` via the normal PR flow, because it requires a
force-push that cannot go through a pull request.

1. Install `git filter-repo` (Homebrew: `brew install git-filter-repo`) if
   not already present.
2. Confirm no forks/other clones exist (already confirmed at the start of
   this public-readiness effort; re-confirm immediately before rewriting,
   since time has passed and PRs have merged).
3. Disable the branch-protection ruleset (`main-protection`,
   `enforcement: "active"` → `"disabled"`) — a force-push cannot succeed
   while `non_fast_forward`/`pull_request` rules are active, even for a
   `RepositoryRole` bypass actor (bypass is scoped to `pull_request` merges
   only, not raw pushes — see the `github-enforce-admins-bypasses-everything`
   memory entry for why this project doesn't rely on bypass for this).
4. Run `git filter-repo` on a fresh clone (filter-repo requires a clone
   with no other work in progress) with:
   - `--path docs/superpowers --invert-paths` (removes the whole tree from
     every commit)
   - `--path protection-test.md --invert-paths`
   - `--path verify-pr-bypass.md --invert-paths`
5. Verify the rewritten history: no commit contains any of the three paths;
   commit count/messages for all *other* paths are unchanged; `npm run
   build && npm test` still pass on the rewritten `HEAD`.
6. Force-push the rewritten `main` to `origin`.
7. Re-create the `main-protection` ruleset with the exact same
   configuration verified in sub-project 2 (`pull_request` rule with
   `required_approving_review_count: 1`, `required_status_checks` for
   `test (18)/(20)/(22)`, `deletion`, `non_fast_forward`, bypass actor
   `RepositoryRole` id 5 with `bypass_mode: "pull_request"`).
8. Verify protection is active again: repeat the two real-push tests from
   sub-project 2 (direct push rejected; PR-merge bypass still works) is
   optional here since the config is byte-identical to what was already
   verified — a single `gh api repos/manuuuel/seh/rulesets` check
   confirming the ruleset exists with `enforcement: "active"` is
   sufficient.

## Testing / verification

- Parts 1-3 (memory files, architecture/glossary refresh, directory
  removal): no automated tests apply to markdown-only changes; `npm run
  build && npm test` must still pass (confirms no accidental side effect).
- Part 4 (history rewrite): verified per steps 5 and 8 above. This is the
  one part of this entire public-readiness effort with no "undo" — the
  pre-rewrite state exists only in this session's history and any local
  reflog until garbage-collected, not recoverable from GitHub after the
  force-push.

## Risks

- **Irreversible.** This is the single highest-risk operation in the whole
  4-part effort. Mitigated by: doing it last (after everything else is
  settled), confirming no forks/clones exist immediately before rewriting,
  and rewriting on a fresh clone (never directly on the working directory
  we've been using all session) so a mistake doesn't corrupt the local
  checkout irrecoverably before the force-push.
- **Branch-protection window.** Between disabling and re-creating the
  ruleset, `main` is briefly unprotected. Mitigated by doing the rewrite as
  one uninterrupted operation and re-creating protection immediately after
  verification, not as a separate later step.
- **Filter-repo removes history, not meaning.** The 22 planning files
  contained more detail than the 11 memory entries capture. This is an
  accepted, deliberate loss (Non-goals) — the full detail was working
  material for building the CLI, not documentation this project commits to
  maintaining going forward.
