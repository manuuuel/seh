# TypeScript Guidelines
- `strict` mode on. Avoid `any`; prefer precise types, unions, and generics.
- Type public boundaries explicitly; let inference handle locals.
- Use discriminated unions over enums where it clarifies intent.
- No non-null assertions (`!`) to silence the compiler — model the type honestly.
- Keep `tsconfig` authoritative; do not weaken it to pass.
