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
