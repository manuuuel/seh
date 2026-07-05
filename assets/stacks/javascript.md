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
