---
type: decision
---

# Package resolution order

Resolution order for any file is: harness package → `~/.seh/` → seh's
bundled core (L0). When a harness package is configured, it takes
precedence over seh's bundled defaults at every layer; if a file is absent
from the package, seh falls back to its bundled core content. This lets a
team's shared package override individual defaults without seh needing to
know about git at all — git is fully external to seh.
