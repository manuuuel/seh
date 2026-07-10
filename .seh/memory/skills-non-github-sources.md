---
type: problem
---

# Should seh skills add support non-GitHub sources and SHA pinning?

`seh skills add <url>` currently expects a GitHub URL. Two open questions:
whether to support non-GitHub sources (a plain HTTPS tarball, or a local
filesystem path, for private/internal skills that don't live on GitHub),
and whether a referenced skill's `ref` should support pinning to a specific
commit SHA (not just a branch/tag) for reproducibility. No decision made
yet; revisit when a real use case needs either.
