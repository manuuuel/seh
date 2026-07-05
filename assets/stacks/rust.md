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
