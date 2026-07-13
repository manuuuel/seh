import { defineConfig } from 'tsup';

// Bundle runtime deps (commander, prompts) into dist/cli.js so the built CLI is
// self-contained: it runs from just `dist/cli.js` + `assets/`, with no
// node_modules. This lets the curl installer (scripts/install.sh) ship a plain
// tarball and symlink the binary — no `npm install`, no git-dep preparation.
export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  platform: 'node',
  dts: true,
  clean: true,
  noExternal: ['commander', 'prompts'],
  // commander/prompts are CJS and call require(); provide a real require in the
  // ESM output so esbuild's require shim resolves node builtins.
  banner: {
    js: "import { createRequire as __sehCreateRequire } from 'module'; const require = __sehCreateRequire(import.meta.url);",
  },
});
