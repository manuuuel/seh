# C Guidelines
- Check every allocation and return value. Free what you allocate; avoid leaks.
- No unbounded `strcpy`/`sprintf`/`gets`; use bounded variants. Validate all indices.
- Initialize variables; avoid undefined behavior. Compile with `-Wall -Wextra` clean.
- Prefer `const` and narrow scope. Document ownership of pointers.
- Test with a unit framework; run under sanitizers/valgrind where available.
