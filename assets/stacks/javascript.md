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
