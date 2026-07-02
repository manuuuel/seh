# Rust Guidelines
- `cargo fmt` and `cargo clippy` clean. Prefer safe Rust; justify any `unsafe`.
- Model errors with `Result`/`?` and `thiserror`/`anyhow`; avoid `unwrap()` in library code.
- Use ownership/borrowing intentionally; avoid needless `clone()`.
- Prefer iterators and pattern matching over manual loops where clearer.
- Test with `#[cfg(test)]` modules; keep tests deterministic.
