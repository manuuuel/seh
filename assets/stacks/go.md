# Go Guidelines

## Toolchain & project layout
- Use modules (`go.mod`); a stable toolchain unless the project pins one. Keep `main` thin; put logic in packages. `go build ./...` clean.

## Formatting & linting
- `gofmt`/`goimports` clean; `go vet` and `golangci-lint` pass. The project config is authoritative.

## Language idioms & style
- Keep interfaces small and defined by the consumer; accept interfaces, return concrete types. Avoid global state.
- Zero values should be useful; prefer composition. Keep packages cohesive.

## Types & correctness
- Handle every error explicitly; wrap with `%w` for context; no naked `_ =` discards on errors.
- Compare with `errors.Is`/`errors.As`; expose sentinel or typed errors at boundaries.

## Error handling
- Return errors rather than panicking across boundaries; `panic` only for truly unrecoverable state. Use `defer` for cleanup.

## Testing
- Table-driven tests with the standard `testing` package; run with `-race`. Deterministic; use `t.Helper` and subtests.

## Dependencies & security
- Minimize dependencies: the stdlib is large — prefer it; justify every module and keep the tree small.
- Commit `go.sum`; run `govulncheck` in CI. Validate all external input.

## Performance & concurrency
- Give every goroutine clear ownership and a way to stop; pass `context.Context` for cancellation and never store it in a struct.
- Protect shared state with channels or `sync`; avoid goroutine leaks. Measure before optimizing.

## Observability
- Structured logging with `log/slog` (no secrets/PII); propagate context.

## Anti-patterns
- Ignored errors, naked returns in long functions, goroutine leaks, overusing `interface{}`/`any`, and storing `context` in structs.
