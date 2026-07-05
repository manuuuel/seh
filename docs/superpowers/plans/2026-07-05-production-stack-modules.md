# Production-Ready Stack Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the 7 per-technology guideline modules under `assets/stacks/` from ~5-bullet skeletons to production-grade, consistently structured guidance.

**Architecture:** Content-only change. Each module follows the same 10-section template (`##` headings), keeps its `# <Tech> Guidelines` H1, stays ~30–50 lines of imperative bullets, uses hybrid tooling phrasing (principle + de-facto tool + "project config wins"), and leads section 7 with dependency minimalism. `javascript.md` carries shared JS/TS ecosystem content; `typescript.md` covers TS-specifics and defers to it.

**Tech Stack:** Markdown assets consumed by `src/catalog.ts` (`stackModule`) and emitted by `seh sync`. No `src/` changes.

## Global Constraints

- Files touched: only `assets/stacks/{javascript,typescript,python,go,c,rust,java}.md`.
- Every module's first line stays exactly `# <Tech> Guidelines` (tests assert this).
- 10 `##` sections in this order: Toolchain & project layout; Formatting & linting; Language idioms & style; Types & correctness; Error handling; Testing; Dependencies & security; Performance & concurrency; Observability; Anti-patterns.
- ~30–50 lines/module; 2–4 imperative bullets per section.
- Hybrid tooling phrasing; version-agnostic ("a supported/LTS version", "stable toolchain").
- Section 7 (Dependencies & security) leads with minimalism (stdlib-first, justify each dep, small tree).
- No `src/` changes; `npm test` and `npm run build` stay green.
- Commit each module with a Conventional Commit (`docs(stacks): …`).

---

### Task 1: javascript.md (base for JS/TS)

**Files:** Overwrite `assets/stacks/javascript.md`

- [ ] **Step 1: Write the file verbatim**

```markdown
# JavaScript Guidelines

## Toolchain & project layout
- Use ESM (`"type": "module"`); target a supported LTS Node — the project's declared version is authoritative.
- One package manager per repo with a committed lockfile; scripts live in `package.json`.
- Keep source in `src/`, tests alongside or in `test/`; never commit build artifacts.

## Formatting & linting
- Format with the standard formatter (Prettier) and lint with ESLint; the project's config is authoritative and never weakened to pass.
- Fix lint findings rather than disabling rules ad hoc. No `console.log` in committed code — use the project logger.

## Language idioms & style
- Prefer `const`, then `let`; never `var`. Favor pure functions and immutability.
- Prefer small modules and named exports; avoid deep inheritance and hidden global state.
- Use optional chaining / nullish coalescing; make null/empty checks explicit.

## Types & correctness
- Always ESM/strict — no implicit globals. Use `===`, never `==`.
- JS has no compile-time types: validate external shapes at boundaries with a schema validator.

## Error handling
- Use `async/await`; never leave a promise rejection unhandled. Guard awaited calls that can fail.
- Throw `Error` (or subclasses), not strings. Fail loud at boundaries; no empty `catch`.

## Testing
- Test with the project's runner (e.g. Vitest / `node:test`): behavior-focused, deterministic, no wall-clock/network reliance.
- Cover edge and failure paths; assert observable behavior, not mocks.

## Dependencies & security
- Minimize dependencies: prefer the standard library and platform APIs; justify every addition and keep the tree small.
- Pin via lockfile and audit regularly. Avoid `eval`/`new Function`, prototype pollution, and dynamic import/require of untrusted input.

## Performance & concurrency
- The event loop is single-threaded: never block it; offload CPU-heavy work to worker threads.
- Batch/stream I/O; run independent async work with `Promise.all` instead of awaiting in a loop. Measure before optimizing.

## Observability
- Structured logging via a library (no secrets/PII); include context and avoid noisy logs in hot paths.

## Anti-patterns
- Floating promises, empty catches, mutating shared state, `var`, magic numbers, and sprawling multi-purpose modules.
```

- [ ] **Step 2: Verify structure**

Run: `head -1 assets/stacks/javascript.md` → `# JavaScript Guidelines`.
Run: `grep -c '^## ' assets/stacks/javascript.md` → `10`.
Run: `wc -l < assets/stacks/javascript.md` → between 30 and 55.

- [ ] **Step 3: Commit**

```bash
git add assets/stacks/javascript.md
git commit -m "docs(stacks): production-ready JavaScript guidelines"
```

---

### Task 2: typescript.md (TS-specific, defers to JS)

**Files:** Overwrite `assets/stacks/typescript.md`

- [ ] **Step 1: Write the file verbatim**

```markdown
# TypeScript Guidelines

> JavaScript guidelines also apply — this module covers TypeScript-specific concerns.

## Toolchain & project layout
- `tsconfig.json` is authoritative with `strict: true`; never weaken it to make code pass.
- Choose `moduleResolution` to match the runtime (`nodenext`/`bundler`); emit declarations for libraries and keep build output out of VCS.

## Formatting & linting
- Use `typescript-eslint` with type-aware rules enabled; the project config wins. Same formatter as JavaScript.

## Language idioms & style
- Prefer precise types, discriminated unions, and generics. Type public boundaries explicitly; let inference handle locals.
- Prefer a union `type` over `enum` where it reads clearer; use `readonly` and `as const` for immutability.

## Types & correctness
- Ban `any` — use `unknown` plus narrowing. No non-null `!` or `as` casts to silence the compiler; model the type honestly.
- Make illegal states unrepresentable; exhaustively check unions (assign the fallthrough to `never`).

## Error handling
- Don't type-assert parsed or external data — validate, then narrow. Type error/result shapes at boundaries.

## Testing
- Runtime testing as in JavaScript; type-check in CI with `tsc --noEmit`. Add type-level tests where they earn their keep.

## Dependencies & security
- Prefer types bundled with the library or from `@types`; keep type-only dev dependencies minimal and version-aligned with runtime deps.

## Performance & concurrency
- Types are erased at runtime — never rely on them for validation. Concurrency rules are identical to JavaScript.

## Observability
- Type log payloads; otherwise follow the JavaScript structured-logging rules.

## Anti-patterns
- `any`, `as` casts, non-null `!`, `@ts-ignore` (prefer `@ts-expect-error` with a reason), enums-by-default, and weakening `tsconfig`.
```

- [ ] **Step 2: Verify structure**

Run: `head -1 assets/stacks/typescript.md` → `# TypeScript Guidelines`.
Run: `grep -c '^## ' assets/stacks/typescript.md` → `10`.
Run: `grep -q 'JavaScript guidelines also apply' assets/stacks/typescript.md` → present.
Run: `wc -l < assets/stacks/typescript.md` → between 30 and 55.

- [ ] **Step 3: Commit**

```bash
git add assets/stacks/typescript.md
git commit -m "docs(stacks): production-ready TypeScript guidelines"
```

---

### Task 3: python.md

**Files:** Overwrite `assets/stacks/python.md`

- [ ] **Step 1: Write the file verbatim**

```markdown
# Python Guidelines

## Toolchain & project layout
- Target a supported CPython — the project's declared version is authoritative. Work inside a virtualenv.
- Manage dependencies with `uv`/`poetry` (or `pip-tools`) and commit a lockfile. Keep source in `src/`, tests in `tests/`, config in `pyproject.toml`.

## Formatting & linting
- Format and lint with `ruff` (Black-compatible); PEP 8 enforced. The project config is authoritative — don't disable rules ad hoc.

## Language idioms & style
- Add type hints everywhere; prefer f-strings, comprehensions, `dataclasses`/`enum`, and context managers (`with`).
- Prefer pure functions; avoid mutable module-level state.

## Types & correctness
- Run `mypy`/`pyright` where configured and type public functions. Never use a mutable default argument.

## Error handling
- Raise specific exceptions; never a bare `except:` (and don't catch `Exception` without handling or re-raising). Use `finally`/context managers for cleanup.

## Testing
- Test with `pytest`: small, deterministic fixtures. Cover edge and failure paths; avoid network/time flakiness.

## Dependencies & security
- Minimize dependencies: prefer the standard library; justify every addition and keep the tree small.
- Pin/lock and audit. Never `eval`/`exec` untrusted input; validate external data; don't `pickle` untrusted sources.

## Performance & concurrency
- Mind the GIL: `asyncio` or threads for I/O-bound work, processes for CPU-bound. Prefer built-in data structures; measure before optimizing.

## Observability
- Use the `logging` module (structured where possible); no secrets/PII. Never `print` for diagnostics.

## Anti-patterns
- Mutable default arguments, bare excepts, wildcard imports, mutable globals, and pulling in a dependency the stdlib already covers.
```

- [ ] **Step 2: Verify structure**

Run: `head -1 assets/stacks/python.md` → `# Python Guidelines`; `grep -c '^## ' … ` → `10`; `wc -l` → 30–55.

- [ ] **Step 3: Commit**

```bash
git add assets/stacks/python.md
git commit -m "docs(stacks): production-ready Python guidelines"
```

---

### Task 4: go.md

**Files:** Overwrite `assets/stacks/go.md`

- [ ] **Step 1: Write the file verbatim**

```markdown
# Go Guidelines

## Toolchain & project layout
- Use modules (`go.mod`); a stable toolchain unless the project pins one. Keep `main` thin; put logic in packages. `go build ./...` clean.

## Formatting & linting
- `gofmt`/`goimports` clean; `go vet` and `golangci-lint` pass. The project config is authoritative.

## Language idioms & style
- Keep interfaces small and defined by the consumer; accept interfaces, return concrete types. Avoid global state.
- Zero values should be useful; prefer composition. Keep packages cohesive.

## Types & correctness
- Handle every error explicitly; wrap with `%w` for context; no naked `_ =` discards on errors.
- Compare with `errors.Is`/`errors.As`; expose sentinel or typed errors at boundaries.

## Error handling
- Return errors rather than panicking across boundaries; `panic` only for truly unrecoverable state. Use `defer` for cleanup.

## Testing
- Table-driven tests with the standard `testing` package; run with `-race`. Deterministic; use `t.Helper` and subtests.

## Dependencies & security
- Minimize dependencies: the stdlib is large — prefer it; justify every module and keep the tree small.
- Commit `go.sum`; run `govulncheck` in CI. Validate all external input.

## Performance & concurrency
- Give every goroutine clear ownership and a way to stop; pass `context.Context` for cancellation and never store it in a struct.
- Protect shared state with channels or `sync`; avoid goroutine leaks. Measure before optimizing.

## Observability
- Structured logging with `log/slog` (no secrets/PII); propagate context.

## Anti-patterns
- Ignored errors, naked returns in long functions, goroutine leaks, overusing `interface{}`/`any`, and storing `context` in structs.
```

- [ ] **Step 2: Verify structure**

Run: `head -1 assets/stacks/go.md` → `# Go Guidelines`; `grep -c '^## '` → `10`; `wc -l` → 30–55.

- [ ] **Step 3: Commit**

```bash
git add assets/stacks/go.md
git commit -m "docs(stacks): production-ready Go guidelines"
```

---

### Task 5: c.md

**Files:** Overwrite `assets/stacks/c.md`

- [ ] **Step 1: Write the file verbatim**

```markdown
# C Guidelines

## Toolchain & project layout
- Target a defined C standard (the project's is authoritative); build with a documented system (Make/CMake) and one clean entrypoint.
- Separate headers and sources; keep public headers minimal and documented.

## Formatting & linting
- Format with `clang-format`; run `clang-tidy` and compile `-Wall -Wextra -Werror` clean. The project config is authoritative.

## Language idioms & style
- Prefer `const` and the narrowest scope; initialize every variable. Use `static` for internal linkage.
- Keep functions small; document pointer ownership and lifetimes.

## Types & correctness
- Check every allocation and return value. Avoid undefined behavior (signed overflow, aliasing, out-of-bounds). Use fixed-width types (`stdint.h`) where size matters.

## Error handling
- Report failures consistently (status codes / `errno`); free every resource on every path (goto-cleanup pattern). No leaks on error.

## Testing
- Unit-test with a framework (Unity/Check/CMocka); run under ASan/UBSan and valgrind. Keep tests deterministic.

## Dependencies & security
- Minimize dependencies: prefer the standard library; justify every external lib and keep the surface small.
- No unbounded `strcpy`/`sprintf`/`gets` — use bounded variants; validate all indices and lengths; treat every input as hostile.

## Performance & concurrency
- Measure before optimizing. For threads, guard shared state (mutex/atomics) and avoid data races; document thread-safety.

## Observability
- Log through one consistent facility (no secrets); make failures diagnosable (`errno`, context).

## Anti-patterns
- Unchecked `malloc`, use-after-free/double-free, buffer overflows, uninitialized reads, and ignoring compiler warnings.
```

- [ ] **Step 2: Verify structure**

Run: `head -1 assets/stacks/c.md` → `# C Guidelines`; `grep -c '^## '` → `10`; `wc -l` → 30–55.

- [ ] **Step 3: Commit**

```bash
git add assets/stacks/c.md
git commit -m "docs(stacks): production-ready C guidelines"
```

---

### Task 6: rust.md

**Files:** Overwrite `assets/stacks/rust.md`

- [ ] **Step 1: Write the file verbatim**

```markdown
# Rust Guidelines

## Toolchain & project layout
- Use Cargo; a stable toolchain unless pinned via `rust-toolchain`. Use workspaces for multi-crate repos; keep crates cohesive. `cargo check` clean.

## Formatting & linting
- `cargo fmt` and `cargo clippy` clean (deny warnings in CI). The project config is authoritative.

## Language idioms & style
- Prefer iterators, pattern matching, and combinators over manual loops where clearer. Use ownership/borrowing intentionally; avoid needless `clone()`.
- Model the domain with enums/newtypes; make illegal states unrepresentable.

## Types & correctness
- Prefer safe Rust; every `unsafe` block is minimal, justified, and documents its invariants.
- Lean on the type system (`Option`, lifetimes) instead of runtime checks.

## Error handling
- Return `Result` and use `?`; `thiserror` for libraries, `anyhow` for applications. Avoid `unwrap()`/`expect()` in library code (only where truly infallible, with a reason).

## Testing
- Unit tests in `#[cfg(test)]` modules, integration tests in `tests/`; `cargo test` deterministic. Doc-tests for public APIs.

## Dependencies & security
- Minimize dependencies: prefer `std`; justify every crate and keep the tree small.
- Commit `Cargo.lock`; run `cargo audit`/`cargo deny` in CI.

## Performance & concurrency
- Fearless concurrency via ownership: prefer `Send`/`Sync` types, channels, or `rayon`. Never block inside an async executor. Measure before optimizing.

## Observability
- Use `tracing`/`log` (structured, no secrets/PII); propagate spans.

## Anti-patterns
- `unwrap()`/`expect()` in libraries, needless `clone()`, `unsafe` without justification, blocking in async, and stringly-typed errors.
```

- [ ] **Step 2: Verify structure**

Run: `head -1 assets/stacks/rust.md` → `# Rust Guidelines`; `grep -c '^## '` → `10`; `wc -l` → 30–55.

- [ ] **Step 3: Commit**

```bash
git add assets/stacks/rust.md
git commit -m "docs(stacks): production-ready Rust guidelines"
```

---

### Task 7: java.md

**Files:** Overwrite `assets/stacks/java.md`

- [ ] **Step 1: Write the file verbatim**

```markdown
# Java Guidelines

## Toolchain & project layout
- Target a supported LTS (the project's is authoritative). Build with Maven or Gradle; standard `src/main`/`src/test` layout with one build entrypoint.

## Formatting & linting
- Format with the project's standard (google-java-format / Spotless); run static analysis (Error Prone / SpotBugs / Checkstyle). The config is authoritative.

## Language idioms & style
- Keep methods small and cohesive. Favor immutability (`final`, `record`s); prefer composition over inheritance.
- Use `var` for obvious locals; use streams where they clarify and loops where they read better.

## Types & correctness
- Return `Optional<T>` instead of null; validate arguments at boundaries (`Objects.requireNonNull`). Avoid raw generic types.

## Error handling
- Throw specific exceptions; never swallow. Use unchecked exceptions for programming errors, checked where the caller can recover. Clean up with try-with-resources.

## Testing
- Test with JUnit 5 (add AssertJ/Mockito as needed); keep tests independent and deterministic. Cover edge and failure paths.

## Dependencies & security
- Minimize dependencies: prefer the JDK; justify every library and keep the tree small.
- Lock versions (a BOM) and scan (OWASP dependency-check). Validate external input; avoid unsafe deserialization.

## Performance & concurrency
- Prefer `java.util.concurrent` (executors, concurrent collections) over raw threads/`synchronized`; share immutable data. Measure before optimizing.

## Observability
- Log via SLF4J (structured, no secrets/PII); never `System.out` or `printStackTrace`.

## Anti-patterns
- Returning null, catch-and-ignore, static singletons over DI, field injection everywhere, and premature abstraction.
```

- [ ] **Step 2: Verify structure**

Run: `head -1 assets/stacks/java.md` → `# Java Guidelines`; `grep -c '^## '` → `10`; `wc -l` → 30–55.

- [ ] **Step 3: Commit**

```bash
git add assets/stacks/java.md
git commit -m "docs(stacks): production-ready Java guidelines"
```

---

### Task 8: Verification (tests, build, sync idempotency)

**Files:** none (verification only)

- [ ] **Step 1: Full suite stays green**

Run: `npx vitest run`
Expected: all tests pass (catalog test still finds `# TypeScript Guidelines` etc.; nothing asserts on the old bullet content).

- [ ] **Step 2: Build unaffected**

Run: `npm run build`
Expected: success, no TypeScript errors (content-only change).

- [ ] **Step 3: Verify `stackModule` loads the new content**

Run: `node -e "import('./dist/catalog.js').catch(()=>{})"` is not needed; instead confirm via a sandboxed sync below.

- [ ] **Step 4: Manual sync idempotency check (sandbox)**

```bash
npm run build
CLI="$PWD/dist/cli.js"; SB=$(mktemp -d); export HOME="$SB/home"; mkdir -p "$HOME"
node "$CLI" init --global --yes >/dev/null
P="$SB/p"; mkdir -p "$P"; cd "$P"
node "$CLI" init --tech typescript,python,go,rust --yes
grep -c '^## ' .seh/stack/typescript.md   # expect 10
node "$CLI" check                          # expect: seh: no drift.
cp AGENTS.md /tmp/a1; node "$CLI" sync >/dev/null; diff -q /tmp/a1 AGENTS.md && echo "idempotent"
cd - >/dev/null; rm -rf "$SB"
```
Expected: stack modules contain the 10 sections, `seh: no drift.`, and the index is idempotent.

- [ ] **Step 5: No commit needed** (verification only). If any step fails, fix the offending module and re-run.

---

## Self-Review

**Spec coverage:** All 7 modules (Tasks 1–7) rewritten to the 10-section template with `# <Tech> Guidelines` H1, ~30–50 lines, hybrid tooling phrasing, dependency-minimalism-first section 7, version-agnostic wording. JS/TS relationship honored (Task 2 defers to Task 1 with the "JavaScript guidelines also apply" note). Verification (Task 8) confirms tests/build/idempotency. ✓

**Placeholder scan:** Every task contains the full final Markdown — no TBD/placeholders. ✓

**Consistency:** All modules use the identical section set and order; each verify step checks `grep -c '^## '` == 10 and the exact H1. Line counts target 30–55 to allow the title/blank lines around the ~30–50 body. ✓

**Ambiguity:** Tooling phrasing uses the "de-facto tool + project config authoritative" pattern uniformly; version wording is agnostic everywhere. ✓
