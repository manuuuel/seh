# JavaScript Guidelines
- Use ESM and `const`/`let`; avoid `var`. Prefer pure functions and immutability.
- Handle promises with `async/await`; never leave rejections unhandled.
- Lint with ESLint; format with Prettier. No `console.log` in committed code.
- Validate external input; avoid `eval` and prototype pollution.
- Test with the project's runner; keep tests deterministic.
