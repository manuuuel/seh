# Python Guidelines
- Target a supported CPython; use type hints and `mypy`/`pyright` where configured.
- Follow PEP 8; format with Black/ruff. Prefer f-strings and context managers.
- Use virtualenv/poetry; pin dependencies. Avoid mutable default arguments.
- Raise specific exceptions; never bare `except:`.
- Test with pytest; keep fixtures small and deterministic.
