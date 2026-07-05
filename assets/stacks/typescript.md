# TypeScript Guidelines

> JavaScript guidelines also apply — this module covers TypeScript-specific concerns.

## Toolchain & project layout
- `tsconfig.json` is authoritative with `strict: true`; never weaken it to make code pass.
- Choose `moduleResolution` to match the runtime (`nodenext`/`bundler`); emit declarations for libraries and keep build output out of VCS.
- Enable `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` for real index/optional safety.

## Formatting & linting
- Use `typescript-eslint` with type-aware rules enabled; the project config wins. Same formatter as JavaScript.

## Language idioms & style
- Prefer precise types, discriminated unions, and generics. Type public boundaries explicitly; let inference handle locals.
- Prefer a union `type` over `enum` where it reads clearer; use `readonly` and `as const` for immutability.

## Types & correctness
- Ban `any` — use `unknown` plus narrowing. No non-null `!` or `as` casts to silence the compiler; model the type honestly.
- Make illegal states unrepresentable; exhaustively check unions (assign the fallthrough to `never`).

## Error handling
- Don't type-assert parsed or external data — validate, then narrow. Type error/result shapes at boundaries.

## Testing
- Runtime testing as in JavaScript; type-check in CI with `tsc --noEmit`. Add type-level tests where they earn their keep.

## Dependencies & security
- Prefer types bundled with the library or from `@types`; keep type-only dev dependencies minimal and version-aligned with runtime deps.

## Performance & concurrency
- Types are erased at runtime — never rely on them for validation. Concurrency rules are identical to JavaScript.

## Observability
- Type log payloads; otherwise follow the JavaScript structured-logging rules.

## Anti-patterns
- `any`, `as` casts, non-null `!`, `@ts-ignore` (prefer `@ts-expect-error` with a reason), enums-by-default, and weakening `tsconfig`.
