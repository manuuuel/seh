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
