#!/bin/sh
# seh installer — downloads a self-contained build and puts `seh` on your PATH.
# No npm, no git-dep preparation, no global node_modules (so it can't hit the
# npm `ENOTDIR` reinstall failures).
#
#   curl -fsSL https://raw.githubusercontent.com/manuuuel/seh/main/scripts/install.sh | sh
#
# Env overrides:
#   SEH_REF   git ref to install (tag or branch). Default: main
#   SEH_HOME  install dir.  Default: ~/.local/share/seh
#   SEH_BIN   bin dir for the `seh` symlink. Default: ~/.local/bin
set -eu

REPO="manuuuel/seh"
REF="${SEH_REF:-main}"
SHARE="${SEH_HOME:-$HOME/.local/share/seh}"
BIN="${SEH_BIN:-$HOME/.local/bin}"

for cmd in node curl tar; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "seh: error: '$cmd' is required on PATH" >&2; exit 1; }
done

echo "seh: installing ref '$REF' -> $SHARE"
rm -rf "$SHARE"
mkdir -p "$SHARE" "$BIN"

# Try the ref as a tag first, then as a branch.
fetch() { curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$1"; }
if ! fetch "refs/tags/$REF"  | tar xz -C "$SHARE" --strip-components=1 2>/dev/null; then
  fetch "refs/heads/$REF" | tar xz -C "$SHARE" --strip-components=1
fi

if [ ! -f "$SHARE/dist/cli.js" ]; then
  echo "seh: error: build artifact dist/cli.js missing in ref '$REF'" >&2
  exit 1
fi

chmod +x "$SHARE/dist/cli.js"
ln -sf "$SHARE/dist/cli.js" "$BIN/seh"
echo "seh: installed -> $BIN/seh"

case ":$PATH:" in
  *":$BIN:"*) ;;
  *) echo "seh: add $BIN to your PATH, e.g.:  export PATH=\"$BIN:\$PATH\"" ;;
esac

"$BIN/seh" --version 2>/dev/null || true
