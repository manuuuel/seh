# SE-Harness — AI Coding Harness Strategy (Design Spec)

**Date:** 2026-07-01
**Status:** Draft for review
**Owner:** Manuel Di Pietro

A reusable, tool-agnostic framework for developing software with AI coding
agents and CLI assistants (Claude Code, Codex, Copilot, Cursor, OpenCode, and
future tools), delivered as an installable CLI.

---

## 1. Problem & Goals

Developing with AI coding agents today means re-writing the same context,
conventions, and guardrails per project and per tool. Instructions drift across
`CLAUDE.md`, `.cursor/rules`, `.github/copilot-instructions.md`, `AGENTS.md`,
etc. This creates vendor lock-in, inconsistency, and maintenance cost.

**Goals**
- One source of truth; many tool entrypoints.
- Portable across AI tools; no vendor lock-in.
- Solo-first, team-ready by design.
- Encodes good engineering behavior (testing, review, security, docs,
  observability, architecture decisions, refactoring, deployment safety)
  without becoming rigid.
- Maintainable and evolvable as projects and tools change.

**Non-goals (v1)**
- Not a CI platform, not a linter, not a replacement for existing tooling.
- Not a prompt-tuning playground; it standardizes *context*, not model internals.
- Not attempting to support all five tools with bespoke formats in v1.

---

## 2. Critical Assessment of the Original Idea

The user's initial idea was two layers: global + local.

- **Correct axis, incomplete.** Two layers is the right *primary* split but misses
  two things.
- **"Tool-specific harness" as a content layer is an anti-pattern.** Real
  instructions inside per-tool files create N drifting copies — the exact
  vendor lock-in we want to avoid. Tool-specificity must be *adapters/pointers only*.
- **"Global" conflates two different things:** universal engineering truth
  (shareable) vs. the owner's personal taste (not shareable). Separate them.
- **Missing an explicit precedence model.** Without "local overrides global
  overrides core," agents receive conflicting instructions.
- **Risk of over-investing in global.** Truly universal content is small; ~80% of
  agent usefulness comes from project-local context. Keep global lean.

**Resolution:** 4 layers, only 3 carry content.

---

## 3. Architecture

| Layer | Name | Location | Content? | Overrides |
|-------|------|----------|----------|-----------|
| **L0** | Core | ships inside CLI package | Yes — universal, shareable | (base) |
| **L1** | Global | `~/.se-harness/` | Yes — personal defaults | L0 |
| **L2** | Project | `<repo>/.harness/` | Yes — repo/stack/domain | L1, L0 |
| **L3** | Adapters | generated tool files | No — pointers/templates only | — |

**Precedence when instructions conflict: L2 > L1 > L0.** Resolved at generation
time. The generator concatenates canonical sources in read-order and annotates
provenance so conflicts are visible and debuggable.

### Layer responsibilities

- **L0 Core** — universal engineering principles, the canonical agent base
  (`AGENTS.base.md`), workflows (feature/debug/refactor/test/review), checklists
  (pre-commit/PR/security/deployment), and templates (ADR/RFC/bug report).
  Technology-agnostic. This is the shareable, publishable part.
- **L1 Global** — the owner's cross-project taste and defaults (communication
  style, commit conventions, "always/never want"). Deliberately small.
- **L2 Project** — mission, architecture & boundaries, stack & commands, code
  conventions, domain glossary. Where most real value lives.
- **L3 Adapters** — a mapping of "target filename + wrapper text" per tool. v1:
  `CLAUDE.md`, `AGENTS.md`. Adapters never introduce engineering rules.

---

## 4. Distribution & The CLI

**Distribution:** installable Node + TypeScript CLI, invoked via `npx se-harness`
or installed globally. **Core (L0) ships inside the package** so it is always
available wherever the CLI is installed.

**Reproducibility:** `sync` writes `harness.lock` recording the core version
used. Team/CI reproducibility (vendoring a core snapshot into the repo) is a
later opt-in, designed-for now, not built now.

### Command surface

| Command | Scope | Behavior |
|---|---|---|
| `se-harness init --global` | host | Interactive setup of `~/.se-harness/` (L1). Run once per machine. |
| `se-harness init` | repo | Scaffolds `.harness/` (L2). Detects stack, asks a few questions, writes project files. |
| `se-harness sync` | repo | Generates tool entrypoints (v1: `CLAUDE.md` + `AGENTS.md`) from L0+L1+L2. Idempotent. Writes `harness.lock`. |
| `se-harness check` | repo | Doctor: validates config; detects drift (generated files stale vs sources); reports missing/empty sections. |
| `se-harness update` | repo | Pulls newer core from the installed CLI into the project, bumps lock, re-syncs. |
| `se-harness add <tool>` | repo | Enables an additional adapter (e.g. `cursor`, `copilot`, `opencode`). |

### Generator rules (invariants)

1. **Idempotent & diff-friendly** — re-running with no source change yields no diff.
2. **Do-not-edit banner** — every generated file starts with a banner pointing
   editors to `.harness/` sources.
3. **Precedence at generation** — L2 > L1 > L0, concatenated in read-order with
   provenance comments.
4. **Adapters are pure templates** — filename + wrapper only, never rules.
5. **Fail loud on drift** — `check` exits non-zero if generated files are stale;
   suitable for a future pre-commit hook / CI step.

---

## 5. Folder & File Structure

### The CLI package (authoring repo)

```
se-harness/                          # this repo — the CLI package
  package.json
  src/                               # TS implementation
    commands/  {init,sync,check,update,add}.ts
    generator/                       # precedence resolver + templating
    adapters/  {claude,agents,cursor,copilot,opencode}.ts   # filename+wrapper
  assets/core/                       # L0 — ships inside the package
    PRINCIPLES.md
    AGENTS.base.md
    workflows/  {feature-development,debugging,refactoring,testing,code-review}.md
    checklists/ {pre-commit,pr-review,security,deployment}.md
    templates/  {adr,rfc,bug-report}.md
  assets/project-template/           # what `init` scaffolds into a repo
    .harness/  {project,architecture,stack,conventions,glossary}.md
  docs/
    superpowers/specs/               # design specs (this file)
```

### L1 — host global (created by `init --global`)

```
~/.se-harness/
  preferences.md                     # personal defaults & taste
  config.json                        # default adapters, CLI settings
```

### L2 — inside a target project (created by `init` + `sync`)

```
<repo>/
  .harness/
    project.md
    architecture.md
    stack.md
    conventions.md
    glossary.md
  harness.lock                       # core version + adapter set (committed)
  CLAUDE.md                          # GENERATED (committed)
  AGENTS.md                          # GENERATED (committed)
```

---

## 6. Example File Contents

Concrete v1 contents are authored as part of implementation. Representative
examples (already drafted during design):

- **`PRINCIPLES.md` (L0)** — prime directives (understand before changing,
  smallest correct change, no silent assumptions, leave codebase runnable, match
  surrounding code), correctness & safety rules, escalation boundaries.
- **`AGENTS.base.md` (L0)** — who the agent is, the read-order/precedence list,
  the default working loop, hard rules (no unrequested commits, no silent deps,
  no disabling tests, no secrets), and an "when unsure" protocol.
- **`preferences.md` (L1)** — communication style, commit conventions,
  always/never-want lists.
- **`.harness/project.md`, `architecture.md`, `stack.md`, `conventions.md`,
  `glossary.md` (L2)** — mission, module boundaries, languages/commands, code
  style, domain terms.
- **Generated `CLAUDE.md` / `AGENTS.md`** — banner + resolved, provenance-annotated
  concatenation of the above in precedence order.

Full first-draft file bodies are delivered with the implementation plan.

---

## 7. Workflows

### 7.1 Start a new project
1. `se-harness init --global` (once per machine, if not done).
2. `git init` / create repo.
3. `se-harness init` → answer stack/domain prompts → fills `.harness/`.
4. Review/edit `.harness/*` (especially `architecture.md`, `stack.md`).
5. `se-harness sync` → generates `CLAUDE.md` + `AGENTS.md`.
6. Commit `.harness/`, generated files, and `harness.lock`.

### 7.2 Add harness to an existing project
1. `se-harness init` in the repo (detects stack, pre-fills where possible).
2. Human fills gaps the detector can't infer (domain, boundaries, conventions).
3. `se-harness sync`; review generated files.
4. Optionally add a `check` step to CI/pre-commit to prevent drift.
5. Commit.

### 7.3 Daily development
1. Edit canonical sources (`.harness/*`), never generated files.
2. `se-harness sync` after changing sources (or via pre-commit hook).
3. Use your AI tool as normal — it reads the generated entrypoint.
4. `se-harness check` catches drift before commit.

### 7.4 AI-assisted task workflows (from L0 `workflows/`)
- **Feature:** restate task → locate code → smallest change + tests → verify → checklist → summary.
- **Debugging:** reproduce → isolate → hypothesis → minimal fix + regression test → verify.
- **Refactoring:** ensure test coverage first → behavior-preserving steps → verify green between steps → no scope creep.
- **Testing:** behavior-focused, deterministic; a test that fails without the change.
- **Code review:** run against `pr-review` + `security` checklists; report findings by severity, no rubber-stamping.

---

## 8. Cross-cutting Engineering Concerns (how they're integrated)

- **Testing** — testing workflow + pre-commit checklist require a failing-first test for behavioral change.
- **Code review** — PR-review checklist; review workflow; severity-tagged findings.
- **Documentation** — principle: update stale docs/comments; ADR/RFC templates for decisions.
- **Security** — dedicated security checklist; hard rules on secrets/untrusted input; escalation for auth/PII/payments.
- **Observability** — conventions can require structured logging/metrics on new surfaces; deployment checklist verifies.
- **Architecture decisions** — ADR template + escalation boundary for architectural change.
- **Refactoring** — dedicated behavior-preserving workflow.
- **Deployment safety** — deployment checklist (migrations, rollback, feature flags, config).

**Rigidity control:** L0 states *principles and defaults*; L2 can override for the
project's reality. Checklists are guidance the agent self-applies, escalated to
hard CI gates only where a team chooses. Escalation boundaries make the agent
ask rather than silently comply or silently violate.

---

## 9. Best Practices (universal)
- One source of truth; tool files are generated artifacts.
- Smallest correct change; behavior-preserving refactors.
- Test behavioral change; keep the build green.
- Explicit escalation over silent assumptions.
- Keep L1 (global) lean; invest in L2 (project) context.
- Commit generated files + lock so the repo is self-describing.

## 10. Anti-patterns to avoid
- Writing real rules inside tool-specific files (drift + lock-in).
- A giant "global" harness that says little but constrains much.
- Hand-editing generated files.
- Speculative abstractions / unrequested refactors.
- Disabling tests/checks to make things pass.
- Treating checklists as immovable law regardless of project reality.

---

## 11. Evaluation — is the harness working?
- **Drift rate:** how often `check` finds stale generated files (want: low).
- **Onboarding time:** time to a productive agent session in a new repo.
- **Rework/escalation quality:** agent asks at the right boundaries, not too much/little.
- **Review findings:** fewer repeat classes of defects over time.
- **Adoption friction:** commands used vs abandoned.
Track qualitatively at first; add metrics if/when a team adopts it.

## 12. Evolution strategy
- Version the core; `update` migrates projects forward.
- Add adapters as tools matter (start Claude + AGENTS.md, expand on demand).
- Fold recurring project-local lessons back into L0 when they prove universal.
- Periodically prune L1/L0 to fight bloat.

---

## 13. Implementation Roadmap
1. **M0 — Core content:** author `assets/core/*` (principles, AGENTS.base, workflows, checklists, templates).
2. **M1 — CLI skeleton:** Node+TS project, arg parsing, `init --global`, `init`.
3. **M2 — Generator:** precedence resolver + templating + `sync` (Claude + AGENTS adapters) + `harness.lock`.
4. **M3 — Safety:** `check` (drift/validation), banners, idempotency tests.
5. **M4 — Lifecycle:** `update`, `add <tool>`, stub remaining adapters.
6. **M5 — Docs & polish:** README, example project, publish.

---

## 14. Open Items
- Reconcile the exploratory scaffold files created before this spec
  (`README.md`, `harness/core/*`, `harness/global/*`) with the package layout in
  §5 during M0 (they become `assets/core/*` / `assets/project-template/*`).
- Decide npm package name / bin name.
- Confirm host global path (`~/.se-harness/`) vs XDG (`~/.config/se-harness/`).
