# Java Guidelines
- Follow standard style; keep methods small and cohesive. Favor immutability (`final`, records).
- Use `Optional` over returning null; validate arguments at boundaries.
- Prefer dependency injection over static singletons. Close resources with try-with-resources.
- Throw specific exceptions; never swallow. Log via a framework, not `System.out`.
- Test with JUnit; keep tests independent and deterministic.
