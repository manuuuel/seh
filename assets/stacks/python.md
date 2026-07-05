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
- Use `Decimal` for money (never `float`); use timezone-aware `datetime` in UTC, not naive local times.

## Error handling
- Raise specific exceptions; never a bare `except:` (and don't catch `Exception` without handling or re-raising). Use `finally`/context managers for cleanup.

## Testing
- Test with `pytest`: small, deterministic fixtures. Cover edge and failure paths; avoid network/time flakiness.

## Dependencies & security
- Minimize dependencies: prefer the standard library; justify every addition and keep the tree small.
- Pin/lock and audit. Never `eval`/`exec` untrusted input; validate external data; don't `pickle` untrusted sources.

## Performance & concurrency
- Mind the GIL: `asyncio` or threads for I/O-bound work, processes for CPU-bound. Prefer built-in data structures; measure before optimizing.
- In `async` code never run blocking/sync I/O or CPU-bound work on the loop — offload to a thread/process executor.

## Observability
- Use the `logging` module (structured where possible); no secrets/PII. Never `print` for diagnostics.

## Anti-patterns
- Mutable default arguments, bare excepts, wildcard imports, mutable globals, and pulling in a dependency the stdlib already covers.
