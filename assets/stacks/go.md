# Go Guidelines
- `gofmt`/`goimports` clean; `go vet` and linters pass.
- Handle every error explicitly; wrap with `%w` for context. No naked `_ =` on errors.
- Keep interfaces small and defined by the consumer. Avoid global state.
- Use contexts for cancellation; never store a context in a struct.
- Table-driven tests with the standard `testing` package.
