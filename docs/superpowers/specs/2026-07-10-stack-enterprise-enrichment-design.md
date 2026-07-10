# Stack content enrichment — design

## Context

Sub-project 3 of a 4-part public-readiness effort (README polish → GitHub
hardening → **stack content enrichment** → history rewrite/memory
migration). The 7 stack modules under `assets/stacks/*.md` are already
dense on language-level idioms (formatting, types, error handling, testing,
dependencies, concurrency, observability, anti-patterns) but say nothing
about the cross-cutting practices that distinguish an enterprise production
codebase from a well-written script: architectural boundaries, API/data
contract discipline, and deployment/CI-CD hygiene.

## Goals

- Add three new sections to every file in `assets/stacks/*.md`:
  **Architecture & boundaries**, **API & data conventions**,
  **CI/CD & deployment** — content adapted to how each language is actually
  used in production (web/service-oriented for JS/TS/Python/Java/Go;
  systems/embedded-oriented for C; both framings for Rust).
- Preserve every existing section and bullet verbatim; only add content and
  reorder to slot the three new sections in.
- Keep each file's final section order identical across all 7 files (see
  Section Order below), so `.seh/stack/<tech>.md` files remain
  structurally predictable for anything that scans them (`seh check`,
  `seh sync`, a human skimming multiple stacks).

## Non-goals

- No changes to `assets/core/*` (global rules) — those are language-agnostic
  and out of scope here.
- No changes to `assets/project-template/*`.
- No git history changes (sub-project 4).
- No new tooling/dependencies introduced into the `seh` CLI itself — this is
  content-only, authored markdown.
- Not attempting exhaustive coverage of every enterprise practice (e.g. no
  multi-tenancy, i18n, compliance/audit-logging sections) — scoped to the
  three categories the user selected (A: architecture, B: API & data,
  C: CI/CD & deployment).

## Section order (applies to every stack file)

1. Toolchain & project layout
2. **Architecture & boundaries** *(new)*
3. Formatting & linting
4. Language idioms & style
5. Types & correctness
6. Error handling
7. **API & data conventions** *(new)*
8. Testing
9. Dependencies & security
10. Performance & concurrency
11. **CI/CD & deployment** *(new)*
12. Observability
13. Anti-patterns

## Per-language content

### JavaScript (`assets/stacks/javascript.md`)

**Architecture & boundaries**
- Layer the codebase: routes/controllers → services (business logic) →
  repositories/data access. Keep controllers thin — no business logic in
  route handlers.
- Wire dependencies explicitly (constructor/factory injection); avoid
  module-level singletons for anything stateful or hard to test in
  isolation.

**API & data conventions**
- Version REST APIs explicitly (URL path `/v1/...` or a version header);
  never break a shipped contract in place — ship a new version alongside it.
- Validate request and response bodies against a schema (e.g. a JSON Schema
  or a validator library) — the schema is the contract, not the
  implementation.
- Database changes ship as migrations that are additive and
  backward-compatible with the currently-deployed code (expand/contract,
  never a destructive change in the same deploy that depends on it).

**CI/CD & deployment**
- Multi-stage Docker build: a build stage with dev dependencies, a slim
  runtime stage with only production dependencies.
- Expose liveness/readiness endpoints (`/health`, `/ready`); handle
  `SIGTERM` to drain in-flight requests before exiting.
- Load configuration from environment variables and validate it at startup
  — fail fast on missing/invalid config rather than failing on first use.
- Gate risky behavior changes behind a feature flag, decoupled from the
  deploy itself.

### TypeScript (`assets/stacks/typescript.md`)

> Note at the top of each new section: "JavaScript's section applies —
> this adds TypeScript-specific concerns."

**Architecture & boundaries**
- As JavaScript. Additionally: DI wiring must preserve type inference —
  avoid `any`-typed service locators or containers that erase the types of
  what they resolve.

**API & data conventions**
- As JavaScript. Additionally: generate or validate TypeScript types from
  the same schema that defines the API contract (e.g.
  `openapi-typescript`, `zod` schemas as the single source for both
  runtime validation and static types) — request/response types must not
  be able to drift from the contract they describe.

**CI/CD & deployment**
- As JavaScript, with `tsc --noEmit` as a required CI step before the
  build stage (type errors fail the pipeline, not just lint warnings).

### Python (`assets/stacks/python.md`)

**Architecture & boundaries**
- Keep the framework layer (views/routers) separate from the domain/service
  layer; the domain layer should not import framework request/response
  objects.
- Use explicit dependency injection (e.g. FastAPI's `Depends`, or
  constructor injection) rather than module-level globals or singletons.

**API & data conventions**
- Version APIs explicitly (`/v1/...`); validate request/response bodies
  with a schema library (e.g. Pydantic) and generate API docs (OpenAPI)
  from that same schema.
- Migrations (Alembic / Django migrations) are additive and reversible;
  run them against a throwaway database in CI before merge, not just in
  production.

**CI/CD & deployment**
- Multi-stage Docker build running as a non-root user.
- Expose a liveness/readiness endpoint (`/healthz`); handle graceful
  shutdown (drain in-flight requests on `SIGTERM`).
- Load configuration from environment variables via a typed settings
  object (e.g. `pydantic-settings`, `django-environ`); fail fast on
  missing/invalid config at startup.
- Gate risky changes behind a feature flag for staged rollout.

### Go (`assets/stacks/go.md`)

**Architecture & boundaries**
- Organize packages by feature/domain, not by technical layer; keep
  non-public packages under `internal/`.
- Wire dependencies explicitly via constructor functions; avoid `init()`
  magic and package-level mutable state.

**API & data conventions**
- Version REST/gRPC APIs explicitly (`/v1` path prefix, or proto package
  versioning); validate all inbound requests explicitly at the boundary.
- Manage schema changes with a migration tool (`golang-migrate`, `atlas`)
  — additive and reversible; generate API docs (OpenAPI/proto docs) from
  the same source of truth as the code.

**CI/CD & deployment**
- Multi-stage Docker build producing a static binary in a
  distroless/scratch runtime image.
- Implement `/healthz` and `/readyz` endpoints; honor `context`
  cancellation on `SIGTERM` for graceful shutdown.
- Load configuration from environment variables with validation at
  startup (`envconfig`, `viper`); fail fast on missing/invalid config.

### Java (`assets/stacks/java.md`)

**Architecture & boundaries**
- Layer the codebase: controller → service → repository; keep framework
  annotations out of the core domain logic where feasible (hexagonal /
  ports-and-adapters for business rules that must outlive the framework).
- Use constructor injection exclusively — never field injection (Spring
  `@Autowired` on a constructor, not a field).

**API & data conventions**
- Version REST APIs explicitly (`/v1` path or media-type versioning);
  validate request bodies with Bean Validation (`@Valid`) at the
  controller boundary.
- Manage schema changes with Flyway or Liquibase — additive and
  backward-compatible; run migrations automatically against a test
  database in CI.

**CI/CD & deployment**
- Multi-stage Docker build using layered JARs (dependencies layer cached
  separately from application code, for faster rebuilds).
- Expose actuator health/readiness endpoints.
- Externalize configuration via Spring profiles/environment variables;
  fail fast on missing required configuration at startup.
- Gate risky changes behind a feature toggle.

### C (`assets/stacks/c.md`)

**Architecture & boundaries**
- Expose a minimal public API via headers; hide internals with `static`
  linkage or opaque structs (pimpl-style) so implementation details can
  change without breaking callers.
- Avoid circular header dependencies; document who owns (and who must
  free) every pointer that crosses a module boundary.

**API & data conventions** *(reframed: ABI, not REST)*
- Version the public ABI explicitly — semantic-version any shared library
  (`.so`/`.dll`), and use symbol versioning where the platform supports it.
- Never change a released struct's layout, size, or field order without a
  major version bump — ABI breakage is a contract breakage.
- Document the wire/data format (endianness, alignment, padding) for
  anything serialized to disk or over a network.

**CI/CD & deployment** *(reframed: build reproducibility, not containers)*
- Pin the toolchain version; build reproducibly so the same source
  produces byte-identical output across machines.
- Cross-compile for every target platform the project ships, as part of
  the same pipeline that builds the primary target.
- Package artifacts with a documented install layout (headers, the
  library, a `pkg-config` file); run the full sanitizer suite
  (ASan/UBSan) in CI before every release, not just on `main`.

### Rust (`assets/stacks/rust.md`)

**Architecture & boundaries**
- Expose the minimum surface from each module/crate (`pub(crate)` by
  default, `pub` only where a real external consumer needs it).
- Prefer trait-based dependency injection at boundaries (accept `&dyn
  Trait` or a generic parameter) over concrete singletons; split workspace
  crates along the same lines as independently testable/deployable units.

**API & data conventions**
- For libraries: enforce semver on the public API — a breaking change is
  a major version bump, checked with `cargo-semver-checks` in CI.
- For services: version REST/gRPC APIs explicitly (`/v1`, proto package
  versioning); validate at the boundary with `serde` plus a validation
  crate.
- Manage schema changes with `sqlx migrate` / `diesel migration` —
  additive and reversible.

**CI/CD & deployment**
- Multi-stage Docker build producing a static (musl) binary in a
  distroless/scratch runtime image, where the target supports it.
- Implement health/readiness endpoints for long-running services; handle
  graceful shutdown via a cancellation signal (`tokio::select!` against a
  shutdown channel), never an abrupt process kill.
- Load configuration from environment variables validated at startup;
  fail fast on missing/invalid config.

## Testing / verification

No automated tests apply to markdown content. Verification is manual:
- Every stack file has exactly 13 `##` sections in the order specified
  above.
- Every existing bullet survives unchanged (diff review: only additions
  and heading-position moves, no deletions/edits of pre-existing text).
- `seh check` still passes (confirms `.seh/stack/*.md` in this repo's own
  `.seh/` directory, if regenerated, matches — though this sub-project only
  touches the bundled `assets/stacks/*.md` source catalog, not this repo's
  own `.seh/stack/*.md`; regenerating this repo's own project files is out
  of scope unless explicitly requested).
- `npm test` still passes. Verified: `test/catalog.test.ts` only asserts
  that `stackModule('typescript')` contains the string `# TypeScript
  Guidelines` (the H1, unchanged by this spec) — no test asserts line
  counts or specific section content, so this addition carries no test risk.

## Risks

- Low risk: markdown-only content addition, fully reversible.
- Each file grows from ~35-40 lines to roughly 70-90 lines. Still within a
  single screen/skim, consistent with the project's "small and sharp"
  principle — not flagged as a concern, but noted as a deliberate tradeoff
  since this was explicitly requested content growth.
- None outstanding — the one open risk (whether `test/catalog.test.ts`
  asserts on file content this change touches) is resolved above: it does
  not.
