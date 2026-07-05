# Production-Ready Stack Modules (Design Spec)

**Date:** 2026-07-05
**Status:** Approved for planning
**Owner:** manuuuel

Upgrade the per-technology guideline modules (`assets/stacks/*.md`) from ~5-bullet
skeletons to production-grade, consistently structured guidance an AI coding agent
can follow. Content-only change; no CLI, loader, or template-structure changes.

## Goal

Each of the 7 stack modules — `javascript`, `typescript`, `python`, `go`, `c`,
`rust`, `java` — becomes a tight, complete, production-ready guideline covering
the full lifecycle for that language, in a single consistent structure.

## Non-goals

- No new languages. No changes to `src/` (detection, catalog loader, commands).
- No change to file names or the `# <Tech> Guidelines` H1 (tests assert on it).
- No tutorials, no long prose — imperative, scannable directives only.

## Shared 10-section template

Every module uses the same section order (H2 `##` headings), tailored per language:

1. **Toolchain & project layout** — supported version(s), package/build manager, standard directory layout, single build/run entrypoint.
2. **Formatting & linting** — the canonical formatter + linter; authoritative, never weakened to pass.
3. **Language idioms & style** — modern features to prefer, constructs to avoid, cohesion/immutability.
4. **Types & correctness** — typing discipline / memory safety / null-safety as relevant to the language.
5. **Error handling** — the language's idiomatic error model; fail loud at boundaries; no swallowing.
6. **Testing** — framework, test structure, what to cover (behavior, edge/failure paths), determinism.
7. **Dependencies & security** — **leads with minimalism: stdlib-first, justify every dependency, keep the tree small**; then pinning/locking, supply-chain hygiene, and the language's common vulnerability classes.
8. **Performance & concurrency** — concurrency model, safe patterns, obvious pitfalls; measure before optimizing.
9. **Observability** — structured logging (no secrets/PII) via a framework, not raw stdout; metrics where relevant.
10. **Anti-patterns** — the language's classic footguns to avoid.

## Style rules

- **Length:** ~30–50 lines per module; 2–4 sharp bullets per section.
- **Hybrid tooling:** state the principle tool-agnostically, then name the current
  de-facto standard as the concrete recommendation, and note the project's already-
  configured tooling wins. Example phrasing: "Format with the standard formatter
  (`gofmt`); the project's configured tools are authoritative."
- **Imperative voice**, consistent with the global modules. No code blocks longer
  than a short inline snippet.
- **First line stays `# <Tech> Guidelines`** (e.g. `# TypeScript Guidelines`).

## JavaScript / TypeScript relationship

Detection pairs them (a `tsconfig.json` project loads both). Therefore:
- `javascript.md` carries the shared ecosystem content (modules/ESM, async, tooling,
  testing, deps, observability) — full 10 sections.
- `typescript.md` covers TS-specific concerns only (type discipline, `tsconfig`
  strictness, generics/unions, `any`/non-null bans, declaration/build/emit), with a
  one-line note: "JavaScript guidelines also apply." It still uses the 10-section
  template but its shared-topic sections stay brief and defer to `javascript.md`.

## Per-language emphasis (what each module must nail)

- **javascript** — ESM, async/await + no unhandled rejections, eslint+prettier, immutability, input validation, no `eval`/prototype pollution, vitest/node test, minimal deps.
- **typescript** — `strict`, no `any`, precise types/unions/generics, no `!` to silence, `tsconfig` authoritative, typed public boundaries, build/emit hygiene.
- **python** — supported CPython, type hints + `mypy`/`pyright`, `ruff`(+format)/PEP 8, `uv`/`poetry` + pinning, no mutable default args, specific exceptions/no bare `except`, `pytest`, context managers.
- **go** — `gofmt`/`goimports`, `go vet` + `golangci-lint`, explicit error handling + `%w` wrapping, small consumer-defined interfaces, `context` for cancellation, table-driven tests, race detector, minimal deps.
- **c** — C standard + `-Wall -Wextra -Werror`, `clang-format`/`clang-tidy`, check every allocation/return, bounded string ops, initialize memory, pointer ownership discipline, ASan/UBSan/valgrind, no UB.
- **rust** — `cargo fmt`/`clippy`, safe Rust (justify `unsafe`), `Result`/`?` + `thiserror`/`anyhow`, avoid `unwrap()` in libs, ownership/borrowing over `clone()`, iterators/pattern matching, `cargo test`, minimal crates.
- **java** — supported LTS, standard style, `final`/records/immutability, `Optional` over null, DI over static singletons, try-with-resources, specific exceptions, framework logging (SLF4J), JUnit 5, Maven/Gradle, minimal deps.

## Acceptance criteria

- All 7 modules follow the 10-section template with the exact `# <Tech> Guidelines` H1.
- Each is ~30–50 lines, imperative bullets, hybrid tooling phrasing.
- Section 7 leads with dependency minimalism in every module.
- `typescript.md` defers shared topics to `javascript.md` (no wholesale duplication) and includes the "JavaScript guidelines also apply" note.
- `npm test` stays green (existing catalog/e2e tests unaffected); `npm run build` unaffected (content-only).
- Re-running `seh sync` in a project regenerates the stack modules identically (idempotent) — verify manually for at least one multi-tech project.
