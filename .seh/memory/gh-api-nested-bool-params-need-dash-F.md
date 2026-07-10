---
type: learning
---

# gh api nested bracket params: use -F for booleans/integers, not -f

`gh api`'s `-f key=value` always sends `value` as a JSON string. For
nested bracket parameters like `required_status_checks[strict]=false` or
`required_pull_request_reviews[required_approving_review_count]=1`, a
string `"false"`/`"1"` fails GitHub's schema validation ("is not a
boolean" / "is not an integer") even though the top-level flag structure
looks identical to a string field. Use `-F` (typed: recognizes `true`/
`false`/numbers/`null`/`@file`) for any nested boolean or integer field.
