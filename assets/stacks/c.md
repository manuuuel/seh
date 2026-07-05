# C Guidelines

## Toolchain & project layout
- Target a defined C standard (the project's is authoritative); build with a documented system (Make/CMake) and one clean entrypoint.
- Separate headers and sources; keep public headers minimal and documented.
- Build hardened where supported: `-D_FORTIFY_SOURCE=2`, `-fstack-protector-strong`, PIE/RELRO.

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

## Testing
- Unit-test with a framework (Unity/Check/CMocka); run under ASan/UBSan and valgrind. Keep tests deterministic.

## Dependencies & security
- Minimize dependencies: prefer the standard library; justify every external lib and keep the surface small.
- No unbounded `strcpy`/`sprintf`/`gets` — use bounded variants; validate all indices and lengths; treat every input as hostile.

## Performance & concurrency
- Measure before optimizing. For threads, guard shared state (mutex/atomics) and avoid data races; document thread-safety.

## Observability
- Log through one consistent facility (no secrets); make failures diagnosable (`errno`, context).

## Anti-patterns
- Unchecked `malloc`, use-after-free/double-free, buffer overflows, uninitialized reads, and ignoring compiler warnings.
