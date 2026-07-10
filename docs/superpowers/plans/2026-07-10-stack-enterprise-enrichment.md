# Stack Enterprise Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new sections (Architecture & boundaries, API & data
conventions, CI/CD & deployment) to each of the 7 files in
`assets/stacks/*.md`, per
`docs/superpowers/specs/2026-07-10-stack-enterprise-enrichment-design.md`.

**Architecture:** Seven independent file rewrites, one per stack module.
Every existing section/bullet is preserved verbatim; three new sections are
inserted at fixed positions so all 7 files share the same 13-section order.

**Tech Stack:** Markdown only.

## Global Constraints

- Final section order in every file: Toolchain & project layout →
  **Architecture & boundaries** → Formatting & linting → Language idioms &
  style → Types & correctness → Error handling → **API & data conventions**
  → Testing → Dependencies & security → Performance & concurrency →
  **CI/CD & deployment** → Observability → Anti-patterns.
- No existing bullet is deleted, reworded, or reordered relative to other
  existing bullets — only the three new sections are inserted.
- `assets/core/*` and `assets/project-template/*` are untouched.
- No test changes needed — verified in the spec that `test/catalog.test.ts`
  does not assert on section content, only the H1 heading string.

---

### Task 1: Enrich `assets/stacks/javascript.md`

**Files:**
- Modify: `assets/stacks/javascript.md` (full file rewrite)

- [ ] **Step 1: Replace the file with this exact content**

```markdown
# JavaScript Guidelines

## Toolchain & project layout
- Use ESM (`"type": "module"`); target a supported LTS Node — the project's declared version is authoritative.
- One package manager per repo with a committed lockfile; scripts live in `package.json`.
- Keep source in `src/`, tests alongside or in `test/`; never commit build artifacts.

## Architecture & boundaries
- Layer the codebase: routes/controllers → services (business logic) → repositories/data access. Keep controllers thin — no business logic in route handlers.
- Wire dependencies explicitly (constructor/factory injection); avoid module-level singletons for anything stateful or hard to test in isolation.

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
- Represent money as integer minor units or a decimal library — never floats; store dates in UTC and use timezone-aware handling, not ad-hoc local `Date` math.

## Error handling
- Use `async/await`; never leave a promise rejection unhandled. Guard awaited calls that can fail.
- Throw `Error` (or subclasses), not strings. Fail loud at boundaries; no empty `catch`.

## API & data conventions
- Version REST APIs explicitly (URL path `/v1/...` or a version header); never break a shipped contract in place — ship a new version alongside it.
- Validate request and response bodies against a schema (e.g. a JSON Schema or a validator library) — the schema is the contract, not the implementation.
- Database changes ship as migrations that are additive and backward-compatible with the currently-deployed code (expand/contract, never a destructive change in the same deploy that depends on it).

## Testing
- Test with the project's runner (e.g. Vitest / `node:test`): behavior-focused, deterministic, no wall-clock/network reliance.
- Cover edge and failure paths; assert observable behavior, not mocks.

## Dependencies & security
- Minimize dependencies: prefer the standard library and platform APIs; justify every addition and keep the tree small.
- Pin via lockfile and audit regularly. Avoid `eval`/`new Function`, prototype pollution, and dynamic import/require of untrusted input.
- Treat installing a dependency as running its code: review new deps and their install scripts; keep versions pinned.

## Performance & concurrency
- The event loop is single-threaded: never block it; offload CPU-heavy work to worker threads.
- Batch/stream I/O; run independent async work with `Promise.all` instead of awaiting in a loop. Measure before optimizing.

## CI/CD & deployment
- Multi-stage Docker build: a build stage with dev dependencies, a slim runtime stage with only production dependencies.
- Expose liveness/readiness endpoints (`/health`, `/ready`); handle `SIGTERM` to drain in-flight requests before exiting.
- Load configuration from environment variables and validate it at startup — fail fast on missing/invalid config rather than failing on first use.
- Gate risky behavior changes behind a feature flag, decoupled from the deploy itself.

## Observability
- Structured logging via a library (no secrets/PII); include context and avoid noisy logs in hot paths.

## Anti-patterns
- Floating promises, empty catches, mutating shared state, `var`, magic numbers, and sprawling multi-purpose modules.
```

- [ ] **Step 2: Verify section order and content preservation**

Run: `grep -n "^## " assets/stacks/javascript.md`
Expected (13 lines, in this order): Toolchain & project layout,
Architecture & boundaries, Formatting & linting, Language idioms & style,
Types & correctness, Error handling, API & data conventions, Testing,
Dependencies & security, Performance & concurrency, CI/CD & deployment,
Observability, Anti-patterns.

- [ ] **Step 3: Commit**

```bash
git add assets/stacks/javascript.md
git commit -m "docs(stacks): add architecture, API, and CI/CD sections to JavaScript"
```

---

### Task 2: Enrich `assets/stacks/typescript.md`

**Files:**
- Modify: `assets/stacks/typescript.md` (full file rewrite)

- [ ] **Step 1: Replace the file with this exact content**

```markdown
# TypeScript Guidelines

> JavaScript guidelines also apply — this module covers TypeScript-specific concerns.

## Toolchain & project layout
- `tsconfig.json` is authoritative with `strict: true`; never weaken it to make code pass.
- Choose `moduleResolution` to match the runtime (`nodenext`/`bundler`); emit declarations for libraries and keep build output out of VCS.
- Enable `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` for real index/optional safety.

## Architecture & boundaries
- JavaScript's architecture rules apply — layered structure, explicit dependency wiring. Additionally: DI wiring must preserve type inference — avoid `any`-typed service locators or containers that erase the types of what they resolve.

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

## API & data conventions
- JavaScript's API conventions apply — versioned contracts, schema-validated bodies, additive migrations. Additionally: generate or validate TypeScript types from the same schema that defines the API contract (e.g. `openapi-typescript`, `zod` schemas as the single source for both runtime validation and static types) — request/response types must not be able to drift from the contract they describe.

## Testing
- Runtime testing as in JavaScript; type-check in CI with `tsc --noEmit`. Add type-level tests where they earn their keep.

## Dependencies & security
- Prefer types bundled with the library or from `@types`; keep type-only dev dependencies minimal and version-aligned with runtime deps.

## Performance & concurrency
- Types are erased at runtime — never rely on them for validation. Concurrency rules are identical to JavaScript.

## CI/CD & deployment
- JavaScript's deployment rules apply — multi-stage Docker, health/readiness endpoints, fail-fast env config, feature flags. Additionally: `tsc --noEmit` is a required CI step before the build stage — type errors fail the pipeline, not just lint warnings.

## Observability
- Type log payloads; otherwise follow the JavaScript structured-logging rules.

## Anti-patterns
- `any`, `as` casts, non-null `!`, `@ts-ignore` (prefer `@ts-expect-error` with a reason), enums-by-default, and weakening `tsconfig`.
```

- [ ] **Step 2: Verify section order and content preservation**

Run: `grep -n "^## " assets/stacks/typescript.md`
Expected (13 lines, same order as Task 1).

- [ ] **Step 3: Commit**

```bash
git add assets/stacks/typescript.md
git commit -m "docs(stacks): add architecture, API, and CI/CD sections to TypeScript"
```

---

### Task 3: Enrich `assets/stacks/python.md`

**Files:**
- Modify: `assets/stacks/python.md` (full file rewrite)

- [ ] **Step 1: Replace the file with this exact content**

```markdown
# Python Guidelines

## Toolchain & project layout
- Target a supported CPython — the project's declared version is authoritative. Work inside a virtualenv.
- Manage dependencies with `uv`/`poetry` (or `pip-tools`) and commit a lockfile. Keep source in `src/`, tests in `tests/`, config in `pyproject.toml`.

## Architecture & boundaries
- Keep the framework layer (views/routers) separate from the domain/service layer; the domain layer should not import framework request/response objects.
- Use explicit dependency injection (e.g. FastAPI's `Depends`, or constructor injection) rather than module-level globals or singletons.

## Formatting & linting
- Format and lint with `ruff` (Black-compatible); PEP 8 enforced. The project config is authoritative — don't disable rules ad hoc.

## Language idioms & style
- Add type hints everywhere; prefer f-strings, comprehensions, `dataclasses`/`enum`, and context managers (`with`).
- Prefer pure functions; avoid mutable module-level state.

## Types & correctness
- Run `mypy`/`pyright` where configured and type public functions. Never use a mutable default argument.
- Use `Decimal` for money (never `float`); use timezone-aware `datetime` in UTC, not naive local times.

## Error handling
- Raise specific exceptions; never a bare `except:` (and don't catch `Exception` without handling or re-raising). Use `finally`/context managers for cleanup.

## API & data conventions
- Version APIs explicitly (`/v1/...`); validate request/response bodies with a schema library (e.g. Pydantic) and generate API docs (OpenAPI) from that same schema.
- Migrations (Alembic / Django migrations) are additive and reversible; run them against a throwaway database in CI before merge, not just in production.

## Testing
- Test with `pytest`: small, deterministic fixtures. Cover edge and failure paths; avoid network/time flakiness.

## Dependencies & security
- Minimize dependencies: prefer the standard library; justify every addition and keep the tree small.
- Pin/lock and audit. Never `eval`/`exec` untrusted input; validate external data; don't `pickle` untrusted sources.

## Performance & concurrency
- Mind the GIL: `asyncio` or threads for I/O-bound work, processes for CPU-bound. Prefer built-in data structures; measure before optimizing.
- In `async` code never run blocking/sync I/O or CPU-bound work on the loop — offload to a thread/process executor.

## CI/CD & deployment
- Multi-stage Docker build running as a non-root user.
- Expose a liveness/readiness endpoint (`/healthz`); handle graceful shutdown (drain in-flight requests on `SIGTERM`).
- Load configuration from environment variables via a typed settings object (e.g. `pydantic-settings`, `django-environ`); fail fast on missing/invalid config at startup.
- Gate risky changes behind a feature flag for staged rollout.

## Observability
- Use the `logging` module (structured where possible); no secrets/PII. Never `print` for diagnostics.

## Anti-patterns
- Mutable default arguments, bare excepts, wildcard imports, mutable globals, and pulling in a dependency the stdlib already covers.
```

- [ ] **Step 2: Verify section order and content preservation**

Run: `grep -n "^## " assets/stacks/python.md`
Expected (13 lines, same order as Task 1).

- [ ] **Step 3: Commit**

```bash
git add assets/stacks/python.md
git commit -m "docs(stacks): add architecture, API, and CI/CD sections to Python"
```

---

### Task 4: Enrich `assets/stacks/go.md`

**Files:**
- Modify: `assets/stacks/go.md` (full file rewrite)

- [ ] **Step 1: Replace the file with this exact content**

```markdown
# Go Guidelines

## Toolchain & project layout
- Use modules (`go.mod`); a stable toolchain unless the project pins one. Keep `main` thin; put logic in packages. `go build ./...` clean.

## Architecture & boundaries
- Organize packages by feature/domain, not by technical layer; keep non-public packages under `internal/`.
- Wire dependencies explicitly via constructor functions; avoid `init()` magic and package-level mutable state.

## Formatting & linting
- `gofmt`/`goimports` clean; `go vet` and `golangci-lint` pass. The project config is authoritative.

## Language idioms & style
- Keep interfaces small and defined by the consumer; accept interfaces, return concrete types. Avoid global state.
- Zero values should be useful; prefer composition. Keep packages cohesive.

## Types & correctness
- Handle every error explicitly; wrap with `%w` for context; no naked `_ =` discards on errors.
- Compare with `errors.Is`/`errors.As`; expose sentinel or typed errors at boundaries.
- Represent money as integer minor units; use `time.Time` with explicit locations, not ambiguous local time.

## Error handling
- Return errors rather than panicking across boundaries; `panic` only for truly unrecoverable state. Use `defer` for cleanup.

## API & data conventions
- Version REST/gRPC APIs explicitly (`/v1` path prefix, or proto package versioning); validate all inbound requests explicitly at the boundary.
- Manage schema changes with a migration tool (`golang-migrate`, `atlas`) — additive and reversible; generate API docs (OpenAPI/proto docs) from the same source of truth as the code.

## Testing
- Table-driven tests with the standard `testing` package; run with `-race`. Deterministic; use `t.Helper` and subtests.

## Dependencies & security
- Minimize dependencies: the stdlib is large — prefer it; justify every module and keep the tree small.
- Commit `go.sum`; run `govulncheck` in CI. Validate all external input.

## Performance & concurrency
- Give every goroutine clear ownership and a way to stop; pass `context.Context` for cancellation and never store it in a struct.
- Protect shared state with channels or `sync`; avoid goroutine leaks. Measure before optimizing.
- Bound and await goroutines with `errgroup`/`sync.WaitGroup`; always honor `ctx` deadlines and cancellation.

## CI/CD & deployment
- Multi-stage Docker build producing a static binary in a distroless/scratch runtime image.
- Implement `/healthz` and `/readyz` endpoints; honor `context` cancellation on `SIGTERM` for graceful shutdown.
- Load configuration from environment variables with validation at startup (`envconfig`, `viper`); fail fast on missing/invalid config.

## Observability
- Structured logging with `log/slog` (no secrets/PII); propagate context.

## Anti-patterns
- Ignored errors, naked returns in long functions, goroutine leaks, overusing `interface{}`/`any`, and storing `context` in structs.
```

- [ ] **Step 2: Verify section order and content preservation**

Run: `grep -n "^## " assets/stacks/go.md`
Expected (13 lines, same order as Task 1).

- [ ] **Step 3: Commit**

```bash
git add assets/stacks/go.md
git commit -m "docs(stacks): add architecture, API, and CI/CD sections to Go"
```

---

### Task 5: Enrich `assets/stacks/java.md`

**Files:**
- Modify: `assets/stacks/java.md` (full file rewrite)

- [ ] **Step 1: Replace the file with this exact content**

```markdown
# Java Guidelines

## Toolchain & project layout
- Target a supported LTS (the project's is authoritative). Build with Maven or Gradle; standard `src/main`/`src/test` layout with one build entrypoint.

## Architecture & boundaries
- Layer the codebase: controller → service → repository; keep framework annotations out of the core domain logic where feasible (hexagonal / ports-and-adapters for business rules that must outlive the framework).
- Use constructor injection exclusively — never field injection (Spring `@Autowired` on a constructor, not a field).

## Formatting & linting
- Format with the project's standard (google-java-format / Spotless); run static analysis (Error Prone / SpotBugs / Checkstyle). The config is authoritative.

## Language idioms & style
- Keep methods small and cohesive. Favor immutability (`final`, `record`s); prefer composition over inheritance.
- Use `var` for obvious locals; use streams where they clarify and loops where they read better.

## Types & correctness
- Return `Optional<T>` instead of null; validate arguments at boundaries (`Objects.requireNonNull`). Avoid raw generic types.
- Honor the `equals`/`hashCode`/`compareTo` contracts. Use `BigDecimal` for money (never `double`) and `java.time` with explicit zones.

## Error handling
- Throw specific exceptions; never swallow. Use unchecked exceptions for programming errors, checked where the caller can recover. Clean up with try-with-resources.

## API & data conventions
- Version REST APIs explicitly (`/v1` path or media-type versioning); validate request bodies with Bean Validation (`@Valid`) at the controller boundary.
- Manage schema changes with Flyway or Liquibase — additive and backward-compatible; run migrations automatically against a test database in CI.

## Testing
- Test with JUnit 5 (add AssertJ/Mockito as needed); keep tests independent and deterministic. Cover edge and failure paths.

## Dependencies & security
- Minimize dependencies: prefer the JDK; justify every library and keep the tree small.
- Lock versions (a BOM) and scan (OWASP dependency-check). Validate external input; avoid unsafe deserialization.

## Performance & concurrency
- Prefer `java.util.concurrent` (executors, concurrent collections) and virtual threads for I/O-bound work over raw threads/`synchronized`; share immutable data. Measure before optimizing.

## CI/CD & deployment
- Multi-stage Docker build using layered JARs (dependencies layer cached separately from application code, for faster rebuilds).
- Expose actuator health/readiness endpoints.
- Externalize configuration via Spring profiles/environment variables; fail fast on missing required configuration at startup.
- Gate risky changes behind a feature toggle.

## Observability
- Log via SLF4J (structured, no secrets/PII); never `System.out` or `printStackTrace`.

## Anti-patterns
- Returning null, catch-and-ignore, static singletons over DI, field injection everywhere, and premature abstraction.
```

- [ ] **Step 2: Verify section order and content preservation**

Run: `grep -n "^## " assets/stacks/java.md`
Expected (13 lines, same order as Task 1).

- [ ] **Step 3: Commit**

```bash
git add assets/stacks/java.md
git commit -m "docs(stacks): add architecture, API, and CI/CD sections to Java"
```

---

### Task 6: Enrich `assets/stacks/c.md`

**Files:**
- Modify: `assets/stacks/c.md` (full file rewrite)

- [ ] **Step 1: Replace the file with this exact content**

```markdown
# C Guidelines

## Toolchain & project layout
- Target a defined C standard (the project's is authoritative); build with a documented system (Make/CMake) and one clean entrypoint.
- Separate headers and sources; keep public headers minimal and documented.
- Build hardened where supported: `-D_FORTIFY_SOURCE=2`, `-fstack-protector-strong`, PIE/RELRO.

## Architecture & boundaries
- Expose a minimal public API via headers; hide internals with `static` linkage or opaque structs (pimpl-style) so implementation details can change without breaking callers.
- Avoid circular header dependencies; document who owns (and who must free) every pointer that crosses a module boundary.

## Formatting & linting
- Format with `clang-format`; run `clang-tidy` and compile `-Wall -Wextra -Werror` clean. The project config is authoritative.

## Language idioms & style
- Prefer `const` and the narrowest scope; initialize every variable. Use `static` for internal linkage.
- Keep functions small; document pointer ownership and lifetimes.

## Types & correctness
- Check every allocation and return value. Avoid undefined behavior (signed overflow, aliasing, out-of-bounds). Use fixed-width types (`stdint.h`) where size matters.
- Watch integer promotion, conversion, and overflow; check lengths/sizes before arithmetic on untrusted input.

## Error handling
- Report failures consistently (status codes / `errno`); free every resource on every path (goto-cleanup pattern). No leaks on error.

## API & data conventions
- Version the public ABI explicitly — semantic-version any shared library (`.so`/`.dll`), and use symbol versioning where the platform supports it.
- Never change a released struct's layout, size, or field order without a major version bump — ABI breakage is a contract breakage.
- Document the wire/data format (endianness, alignment, padding) for anything serialized to disk or over a network.

## Testing
- Unit-test with a framework (Unity/Check/CMocka); run under ASan/UBSan and valgrind. Keep tests deterministic.

## Dependencies & security
- Minimize dependencies: prefer the standard library; justify every external lib and keep the surface small.
- No unbounded `strcpy`/`sprintf`/`gets` — use bounded variants; validate all indices and lengths; treat every input as hostile.

## Performance & concurrency
- Measure before optimizing. For threads, guard shared state (mutex/atomics) and avoid data races; document thread-safety.

## CI/CD & deployment
- Pin the toolchain version; build reproducibly so the same source produces byte-identical output across machines.
- Cross-compile for every target platform the project ships, as part of the same pipeline that builds the primary target.
- Package artifacts with a documented install layout (headers, the library, a `pkg-config` file); run the full sanitizer suite (ASan/UBSan) in CI before every release, not just on `main`.

## Observability
- Log through one consistent facility (no secrets); make failures diagnosable (`errno`, context).

## Anti-patterns
- Unchecked `malloc`, use-after-free/double-free, buffer overflows, uninitialized reads, and ignoring compiler warnings.
```

- [ ] **Step 2: Verify section order and content preservation**

Run: `grep -n "^## " assets/stacks/c.md`
Expected (13 lines, same order as Task 1).

- [ ] **Step 3: Commit**

```bash
git add assets/stacks/c.md
git commit -m "docs(stacks): add architecture, ABI, and build sections to C"
```

---

### Task 7: Enrich `assets/stacks/rust.md`

**Files:**
- Modify: `assets/stacks/rust.md` (full file rewrite)

- [ ] **Step 1: Replace the file with this exact content**

```markdown
# Rust Guidelines

## Toolchain & project layout
- Use Cargo; a stable toolchain unless pinned via `rust-toolchain`. Use workspaces for multi-crate repos; keep crates cohesive. `cargo check` clean.

## Architecture & boundaries
- Expose the minimum surface from each module/crate (`pub(crate)` by default, `pub` only where a real external consumer needs it).
- Prefer trait-based dependency injection at boundaries (accept `&dyn Trait` or a generic parameter) over concrete singletons; split workspace crates along the same lines as independently testable/deployable units.

## Formatting & linting
- `cargo fmt` and `cargo clippy` clean (deny warnings in CI). The project config is authoritative.

## Language idioms & style
- Prefer iterators, pattern matching, and combinators over manual loops where clearer. Use ownership/borrowing intentionally; avoid needless `clone()`.
- Model the domain with enums/newtypes; make illegal states unrepresentable.

## Types & correctness
- Prefer safe Rust; every `unsafe` block is minimal, justified, and documents its invariants.
- Lean on the type system (`Option`, lifetimes) instead of runtime checks.
- Represent money as integer minor units or a decimal crate — never floats; handle time zones explicitly (`chrono`/`time`).

## Error handling
- Return `Result` and use `?`; `thiserror` for libraries, `anyhow` for applications. Avoid `unwrap()`/`expect()` in library code (only where truly infallible, with a reason).

## API & data conventions
- For libraries: enforce semver on the public API — a breaking change is a major version bump, checked with `cargo-semver-checks` in CI.
- For services: version REST/gRPC APIs explicitly (`/v1`, proto package versioning); validate at the boundary with `serde` plus a validation crate.
- Manage schema changes with `sqlx migrate` / `diesel migration` — additive and reversible.

## Testing
- Unit tests in `#[cfg(test)]` modules, integration tests in `tests/`; `cargo test` deterministic. Doc-tests for public APIs.

## Dependencies & security
- Minimize dependencies: prefer `std`; justify every crate and keep the tree small.
- Commit `Cargo.lock`; run `cargo audit`/`cargo deny` in CI.

## Performance & concurrency
- Fearless concurrency via ownership: prefer `Send`/`Sync` types, channels, or `rayon`. Never block inside an async executor. Measure before optimizing.

## CI/CD & deployment
- Multi-stage Docker build producing a static (musl) binary in a distroless/scratch runtime image, where the target supports it.
- Implement health/readiness endpoints for long-running services; handle graceful shutdown via a cancellation signal (`tokio::select!` against a shutdown channel), never an abrupt process kill.
- Load configuration from environment variables validated at startup; fail fast on missing/invalid config.

## Observability
- Use `tracing`/`log` (structured, no secrets/PII); propagate spans.

## Anti-patterns
- `unwrap()`/`expect()` in libraries, needless `clone()`, `unsafe` without justification, blocking in async, and stringly-typed errors.
```

- [ ] **Step 2: Verify section order and content preservation**

Run: `grep -n "^## " assets/stacks/rust.md`
Expected (13 lines, same order as Task 1).

- [ ] **Step 3: Commit**

```bash
git add assets/stacks/rust.md
git commit -m "docs(stacks): add architecture, API, and CI/CD sections to Rust"
```

---

### Task 8: Full-suite verification

**Files:** None (verification only, no changes).

- [ ] **Step 1: Confirm all 7 files share the same section order**

Run: `for f in assets/stacks/*.md; do echo "=== $f ==="; grep -n "^## " "$f"; done`

Expected: every file lists the same 13 section names in the same order
(Toolchain & project layout, Architecture & boundaries, Formatting &
linting, Language idioms & style, Types & correctness, Error handling,
API & data conventions, Testing, Dependencies & security, Performance &
concurrency, CI/CD & deployment, Observability, Anti-patterns).

- [ ] **Step 2: Run the full test suite**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass (content changes don't touch
`src/`, so this confirms no accidental side effect).

- [ ] **Step 3: No commit** (verification only; no files changed in this task)
