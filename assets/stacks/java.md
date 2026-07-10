# Java Guidelines

## Toolchain & project layout
- Target a supported LTS (the project's is authoritative). Build with Maven or Gradle; standard `src/main`/`src/test` layout with one build entrypoint.

## Architecture & boundaries
- Layer the codebase: controller → service → repository; keep framework annotations out of the core domain logic where feasible (hexagonal / ports-and-adapters for business rules that must outlive the framework).
- Use constructor injection exclusively — never field injection (Spring `@Autowired` on a constructor, not a field).

## Formatting & linting
- Format with the project's standard (google-java-format / Spotless); run static analysis (Error Prone / SpotBugs / Checkstyle). The config is authoritative.

## Language idioms & style
- Keep methods small and cohesive. Favor immutability (`final`, `record`s); prefer composition over inheritance.
- Use `var` for obvious locals; use streams where they clarify and loops where they read better.

## Types & correctness
- Return `Optional<T>` instead of null; validate arguments at boundaries (`Objects.requireNonNull`). Avoid raw generic types.
- Honor the `equals`/`hashCode`/`compareTo` contracts. Use `BigDecimal` for money (never `double`) and `java.time` with explicit zones.

## Error handling
- Throw specific exceptions; never swallow. Use unchecked exceptions for programming errors, checked where the caller can recover. Clean up with try-with-resources.

## API & data conventions
- Version REST APIs explicitly (`/v1` path or media-type versioning); validate request bodies with Bean Validation (`@Valid`) at the controller boundary.
- Manage schema changes with Flyway or Liquibase — additive and backward-compatible; run migrations automatically against a test database in CI.

## Testing
- Test with JUnit 5 (add AssertJ/Mockito as needed); keep tests independent and deterministic. Cover edge and failure paths.

## Dependencies & security
- Minimize dependencies: prefer the JDK; justify every library and keep the tree small.
- Lock versions (a BOM) and scan (OWASP dependency-check). Validate external input; avoid unsafe deserialization.

## Performance & concurrency
- Prefer `java.util.concurrent` (executors, concurrent collections) and virtual threads for I/O-bound work over raw threads/`synchronized`; share immutable data. Measure before optimizing.

## CI/CD & deployment
- Multi-stage Docker build using layered JARs (dependencies layer cached separately from application code, for faster rebuilds).
- Expose actuator health/readiness endpoints.
- Externalize configuration via Spring profiles/environment variables; fail fast on missing required configuration at startup.
- Gate risky changes behind a feature toggle.

## Observability
- Log via SLF4J (structured, no secrets/PII); never `System.out` or `printStackTrace`.

## Anti-patterns
- Returning null, catch-and-ignore, static singletons over DI, field injection everywhere, and premature abstraction.
