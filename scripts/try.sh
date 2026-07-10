#!/usr/bin/env bash
# Sandboxed end-to-end demo of the seh CLI. Touches NOTHING in your real home.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
CLI="$REPO/dist/cli.js"
[ -f "$CLI" ] || { echo "Building…"; (cd "$REPO" && npm run build >/dev/null); }

SB="$(mktemp -d)"
export HOME="$SB/home"; mkdir -p "$HOME"
run() { echo "+ seh $*"; node "$CLI" "$@"; echo; }

echo "### Sandbox HOME=$HOME (your real home is untouched)"; echo

echo "== 1. Global harness (symlink Claude, Codex, Gemini) =="
run init --global --agents claude,codex,gemini --yes
echo "  ~/.seh contents:"; find "$HOME/.seh" -type f | sed "s#$HOME#~#" | sort; echo
echo "  Claude symlink -> $(readlink "$HOME/.claude/CLAUDE.md" | sed "s#$HOME#~#")"
echo "  Codex symlink -> $(readlink "$HOME/.codex/AGENTS.md" | sed "s#$HOME#~#")"
echo "  Gemini symlink -> $(readlink "$HOME/.gemini/GEMINI.md" | sed "s#$HOME#~#")"; echo

echo "== 2. A throwaway TypeScript+Go project =="
PROJ="$SB/demo"; mkdir -p "$PROJ"; cd "$PROJ"
printf '{}' > package.json; printf '{}' > tsconfig.json; printf 'module demo\n' > go.mod
run init --yes                       # auto-detects javascript, typescript, go
echo "  Generated AGENTS.md index:"; sed 's/^/    /' AGENTS.md; echo
echo "  Stack modules:"; ls .seh/stack | sed 's/^/    /'; echo

echo "== 3. Drift detection =="
run check                            # clean
echo "  (tampering .seh/stack/go.md …)"; echo "HACK" >> .seh/stack/go.md
run check || echo "  -> exit $? (drift detected, as expected)"; echo
run sync                             # regenerate
run check                            # clean again

echo "== 4. Unlink the tools =="
run link --remove claude
run link --remove codex
run link --remove gemini

echo "### Done. Sandbox left at: $SB (delete with: rm -rf \"$SB\")"
