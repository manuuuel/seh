# README polish & public-readiness — design

## Context

`seh` is about to be published publicly. This is sub-project 1 of a 4-part
public-readiness effort (README polish → GitHub hardening/CONTRIBUTING →
stack content enrichment → history rewrite/memory migration). This spec
covers only the README restructuring.

The current `README.md` (~410 lines) is reference-heavy: it opens straight
into an architecture table (Layers) before explaining the value proposition
or showing a runnable example. For a public repo, the README is the primary
conversion surface for a first-time visitor, so the pitch and a working
example need to come first.

## Goals

- Reorder the README so a first-time visitor sees value before architecture.
- Add lightweight visual signals (badges) appropriate for a public repo.
- Add navigation (table of contents) given the document's length.
- Remove the redundant `## License` section (the `LICENSE` file is the
  single source of truth for license text; `package.json` already declares
  `"license": "MIT"`). No replacement footer line — badge is sufficient
  signal.
- Add a placeholder `## Contributing` section pointing at `CONTRIBUTING.md`
  (created in the next sub-project, immediately following this one, so the
  link is live before publish).
- Preserve all existing reference content — this is a reorganization plus
  two new short sections, not a rewrite of the command reference.

## Non-goals

- No changes to `CONTRIBUTING.md`, GitHub settings, or branch protection
  (sub-project 2).
- No changes to stack module content (sub-project 3).
- No git history changes (sub-project 4).
- No npm version badge — the package isn't published yet; adding it now
  would render as a broken/404 badge. Documented here as a deliberate
  deferral, not an oversight.

## New structure

1. **Title + tagline** — tightened to 1–2 lines from the current opening
   paragraph.
2. **Badges** — CI status (GitHub Actions), License (MIT), Node engines
   (`>=18`). All three resolve correctly today without requiring a
   publish step.
3. **Table of Contents** — GitHub-anchor links to every `##` section.
4. **Quick Start** (new) — the fastest path to a working result:
   install → `seh init --global` → `seh init` → `seh sync`. Copy-pasteable,
   ~15 lines, no explanation of internals.
5. **Why seh** (new, ~4 sentences) — single source of truth, tool-agnostic,
   no vendor lock-in. Distilled from the current opening paragraph; no new
   claims introduced.
6. **Concepts** — existing "Layers" table and "The two shapes of
   AGENTS.md" section, content unchanged, moved below the pitch.
7. **Commands** — existing global/project/sync/check/link command
   reference, unchanged.
8. **Harness Packages** — existing content, unchanged.
9. **Skills** — existing content, unchanged.
10. **Memory** — existing content, unchanged.
11. **Agent skill directories** — existing content, unchanged.
12. **Installation** — existing content, unchanged.
13. **Try it** — existing content, unchanged.
14. **Development** — existing content, unchanged.
15. **Contributing** (new) — one line: "See [CONTRIBUTING.md](CONTRIBUTING.md)
    for how to propose changes." No further detail here; the contributing
    process itself is out of scope for this spec.

No `## License` section. No footer.

## Content rules

- Every existing sentence in the command/package/skills/memory reference
  sections is preserved verbatim; only section order changes.
- Quick Start and Why seh are the only genuinely new prose; both must be
  consistent with — not contradict — the detailed reference sections below
  them.
- Table of Contents entries must match final heading text exactly (GitHub
  anchor generation is case-insensitive, space-to-hyphen).

## Testing / verification

- No automated tests apply to a markdown file. Verification is manual:
  - All internal TOC links resolve (spot-check by rendering).
  - `npm test` and `npm run build` still pass (README changes don't affect
    them, but this confirms the sub-project touched nothing else).
  - Visual read-through: value prop and a runnable example appear before
    any table/reference content.

## Risks

- Low risk: markdown-only change, fully reversible, no code/behavior
  impact.
- The `CONTRIBUTING.md` link will be dangling for the short window between
  this sub-project's commit and the next one. Mitigated by doing the next
  sub-project (GitHub hardening + CONTRIBUTING.md) immediately after, before
  any public announcement.
